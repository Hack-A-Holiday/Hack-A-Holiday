import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Itinerary } from '../types';

export interface S3ServiceConfig {
  bucketName: string;
  region?: string;
  endpoint?: string; // For local development
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  expires?: Date;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds, default 3600 (1 hour)
  responseContentType?: string;
  responseContentDisposition?: string;
}

export class S3Service {
  private client: S3Client;
  private bucketName: string;

  constructor(config: S3ServiceConfig) {
    this.client = new S3Client({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      ...(config.endpoint && { endpoint: config.endpoint, forcePathStyle: true })
    });
    this.bucketName = config.bucketName;
  }

  /**
   * Upload itinerary as JSON file
   */
  async uploadItinerary(
    userId: string | undefined,
    tripId: string,
    itinerary: Itinerary
  ): Promise<string> {
    const key = this.getItineraryKey(userId, tripId, 'json');
    const content = JSON.stringify(itinerary, null, 2);

    await this.uploadFile(key, content, {
      contentType: 'application/json',
      metadata: {
        tripId,
        userId: userId || 'anonymous',
        destination: itinerary.destination,
        totalCost: itinerary.totalCost.toString(),
      },
      cacheControl: 'max-age=3600', // Cache for 1 hour
    });

    return key;
  }

  /**
   * Upload itinerary as PDF (placeholder - would need PDF generation library)
   */
  async uploadItineraryPDF(
    userId: string | undefined,
    tripId: string,
    pdfBuffer: Buffer
  ): Promise<string> {
    const key = this.getItineraryKey(userId, tripId, 'pdf');

    await this.uploadFile(key, pdfBuffer, {
      contentType: 'application/pdf',
      metadata: {
        tripId,
        userId: userId || 'anonymous',
        type: 'itinerary-pdf',
      },
      cacheControl: 'max-age=86400', // Cache for 24 hours
    });

    return key;
  }

  /**
   * Upload booking confirmations
   */
  async uploadBookingConfirmations(
    userId: string | undefined,
    tripId: string,
    confirmations: any[]
  ): Promise<string> {
    const key = this.getBookingConfirmationsKey(userId, tripId);
    const content = JSON.stringify(confirmations, null, 2);

    await this.uploadFile(key, content, {
      contentType: 'application/json',
      metadata: {
        tripId,
        userId: userId || 'anonymous',
        type: 'booking-confirmations',
        count: confirmations.length.toString(),
      },
    });

    return key;
  }

  /**
   * Generic file upload
   */
  async uploadFile(
    key: string,
    content: string | Buffer | Uint8Array,
    options: UploadOptions = {}
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
        CacheControl: options.cacheControl,
        Expires: options.expires,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Get file content
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);
      
      if (!response.Body) {
        throw new Error('No file content received');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error getting file from S3:', error);
      throw new Error(`Failed to get file: ${error}`);
    }
  }

  /**
   * Get itinerary from S3
   */
  async getItinerary(userId: string | undefined, tripId: string): Promise<Itinerary | null> {
    try {
      const key = this.getItineraryKey(userId, tripId, 'json');
      const buffer = await this.getFile(key);
      const content = buffer.toString('utf-8');
      return JSON.parse(content) as Itinerary;
    } catch (error) {
      console.error('Error getting itinerary from S3:', error);
      return null;
    }
  }

  /**
   * Generate signed URL for file access
   */
  async getSignedUrl(
    key: string,
    options: SignedUrlOptions = {}
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentType: options.responseContentType,
        ResponseContentDisposition: options.responseContentDisposition,
      });

      return await getSignedUrl(this.client, command, {
        expiresIn: options.expiresIn || 3600, // 1 hour default
      });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error}`);
    }
  }

  /**
   * Generate signed URL for itinerary
   */
  async getItinerarySignedUrl(
    userId: string | undefined,
    tripId: string,
    format: 'json' | 'pdf' = 'json',
    options: SignedUrlOptions = {}
  ): Promise<string> {
    const key = this.getItineraryKey(userId, tripId, format);
    
    const urlOptions: SignedUrlOptions = {
      ...options,
      responseContentType: format === 'pdf' ? 'application/pdf' : 'application/json',
      responseContentDisposition: `attachment; filename="itinerary-${tripId}.${format}"`,
    };

    return await this.getSignedUrl(key, urlOptions);
  }

  /**
   * Delete file
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Delete all files for a trip
   */
  async deleteTripFiles(userId: string | undefined, tripId: string): Promise<void> {
    const prefix = this.getTripPrefix(userId, tripId);
    
    try {
      // List all objects with the trip prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.client.send(listCommand);
      
      if (response.Contents && response.Contents.length > 0) {
        // Delete each file
        const deletePromises = response.Contents.map(object => {
          if (object.Key) {
            return this.deleteFile(object.Key);
          }
        }).filter(Boolean);

        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error('Error deleting trip files:', error);
      throw new Error(`Failed to delete trip files: ${error}`);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
    metadata?: Record<string, string>;
  } | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);
      
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List files for a user
   */
  async listUserFiles(
    userId: string,
    prefix?: string,
    maxKeys: number = 100
  ): Promise<Array<{
    key: string;
    size?: number;
    lastModified?: Date;
    contentType?: string;
  }>> {
    try {
      const fullPrefix = prefix 
        ? `users/${userId}/${prefix}`
        : `users/${userId}/`;

      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: fullPrefix,
        MaxKeys: maxKeys,
      });

      const response = await this.client.send(command);
      
      return (response.Contents || []).map(object => ({
        key: object.Key!,
        size: object.Size,
        lastModified: object.LastModified,
      }));
    } catch (error) {
      console.error('Error listing user files:', error);
      throw new Error(`Failed to list user files: ${error}`);
    }
  }

  /**
   * Generate key for itinerary file
   */
  private getItineraryKey(
    userId: string | undefined,
    tripId: string,
    format: 'json' | 'pdf'
  ): string {
    const userPath = userId ? `users/${userId}` : 'anonymous';
    return `${userPath}/trips/${tripId}/itinerary.${format}`;
  }

  /**
   * Generate key for booking confirmations
   */
  private getBookingConfirmationsKey(
    userId: string | undefined,
    tripId: string
  ): string {
    const userPath = userId ? `users/${userId}` : 'anonymous';
    return `${userPath}/trips/${tripId}/booking-confirmations.json`;
  }

  /**
   * Generate prefix for all trip files
   */
  private getTripPrefix(userId: string | undefined, tripId: string): string {
    const userPath = userId ? `users/${userId}` : 'anonymous';
    return `${userPath}/trips/${tripId}/`;
  }

  /**
   * Get bucket name (useful for testing)
   */
  getBucketName(): string {
    return this.bucketName;
  }
}