import { 
  DynamoDBClient, 
  GetItemCommand, 
  PutItemCommand, 
  UpdateItemCommand, 
  DeleteItemCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand as DocQueryCommand,
  ScanCommand as DocScanCommand
} from '@aws-sdk/lib-dynamodb';

export interface RepositoryConfig {
  tableName: string;
  region?: string;
  endpoint?: string; // For local development
}

export interface QueryOptions {
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
  scanIndexForward?: boolean;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
}

export interface UpdateOptions {
  updateExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
  conditionExpression?: string;
}

export class BaseRepository {
  protected client: DynamoDBDocumentClient;
  protected tableName: string;

  constructor(config: RepositoryConfig) {
    const dynamoClient = new DynamoDBClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      ...(config.endpoint && { endpoint: config.endpoint })
    });
    
    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });
    
    this.tableName = config.tableName;
  }

  /**
   * Get a single item by primary key
   */
  async getItem(key: Record<string, any>): Promise<any | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: key,
      });

      const result = await this.client.send(command);
      return result.Item || null;
    } catch (error) {
      console.error('Error getting item:', error);
      throw new Error(`Failed to get item: ${error}`);
    }
  }

  /**
   * Put an item (create or replace)
   */
  async putItem(item: Record<string, any>): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          ...item,
          updatedAt: new Date().toISOString(),
        },
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error putting item:', error);
      throw new Error(`Failed to put item: ${error}`);
    }
  }

  /**
   * Update an item
   */
  async updateItem(
    key: Record<string, any>, 
    options: UpdateOptions
  ): Promise<any> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: key,
        UpdateExpression: options.updateExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: {
          ...options.expressionAttributeValues,
          ':updatedAt': new Date().toISOString(),
        },
        ConditionExpression: options.conditionExpression,
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.client.send(command);
      return result.Attributes;
    } catch (error) {
      console.error('Error updating item:', error);
      throw new Error(`Failed to update item: ${error}`);
    }
  }

  /**
   * Delete an item
   */
  async deleteItem(key: Record<string, any>): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error(`Failed to delete item: ${error}`);
    }
  }

  /**
   * Query items
   */
  async query(
    keyConditionExpression: string,
    options: QueryOptions = {}
  ): Promise<{ items: any[]; lastEvaluatedKey?: Record<string, any> }> {
    try {
      const command = new DocQueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        FilterExpression: options.filterExpression,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey,
        ScanIndexForward: options.scanIndexForward,
      });

      const result = await this.client.send(command);
      return {
        items: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
      };
    } catch (error) {
      console.error('Error querying items:', error);
      throw new Error(`Failed to query items: ${error}`);
    }
  }

  /**
   * Query items using GSI
   */
  async queryGSI(
    indexName: string,
    keyConditionExpression: string,
    options: QueryOptions = {}
  ): Promise<{ items: any[]; lastEvaluatedKey?: Record<string, any> }> {
    try {
      const command = new DocQueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        FilterExpression: options.filterExpression,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey,
        ScanIndexForward: options.scanIndexForward,
      });

      const result = await this.client.send(command);
      return {
        items: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
      };
    } catch (error) {
      console.error('Error querying GSI:', error);
      throw new Error(`Failed to query GSI: ${error}`);
    }
  }

  /**
   * Scan table (use sparingly)
   */
  async scan(options: QueryOptions = {}): Promise<{ items: any[]; lastEvaluatedKey?: Record<string, any> }> {
    try {
      const command = new DocScanCommand({
        TableName: this.tableName,
        FilterExpression: options.filterExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey,
      });

      const result = await this.client.send(command);
      return {
        items: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
      };
    } catch (error) {
      console.error('Error scanning table:', error);
      throw new Error(`Failed to scan table: ${error}`);
    }
  }

  /**
   * Batch get items (up to 100 items)
   */
  async batchGetItems(keys: Record<string, any>[]): Promise<any[]> {
    if (keys.length === 0) return [];
    if (keys.length > 100) {
      throw new Error('Cannot batch get more than 100 items at once');
    }

    try {
      // For simplicity, we'll use individual gets
      // In production, you might want to use BatchGetCommand
      const promises = keys.map(key => this.getItem(key));
      const results = await Promise.all(promises);
      return results.filter(item => item !== null);
    } catch (error) {
      console.error('Error batch getting items:', error);
      throw new Error(`Failed to batch get items: ${error}`);
    }
  }

  /**
   * Check if item exists
   */
  async itemExists(key: Record<string, any>): Promise<boolean> {
    const item = await this.getItem(key);
    return item !== null;
  }

  /**
   * Get table name (useful for testing)
   */
  getTableName(): string {
    return this.tableName;
  }
}