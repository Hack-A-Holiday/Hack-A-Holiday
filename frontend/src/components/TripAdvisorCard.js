import React, { useState } from 'react';
import Image from 'next/image';
import { StarIcon, MapPinIcon, PhoneIcon, GlobeAltIcon } from '@heroicons/react/24/solid';
import { HeartIcon, ShareIcon } from '@heroicons/react/24/outline';

const TripAdvisorCard = ({ 
  location, 
  showPhotos = true, 
  showReviews = true, 
  onSelect,
  className = "" 
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const {
    contentId,
    name,
    rating,
    reviewCount,
    description,
    address,
    photos = [],
    reviews = [],
    category,
    priceLevel,
    website,
    phone,
    latitude,
    longitude
  } = location;

  const handleLike = (e) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: name,
        text: description,
        url: website || `https://www.tripadvisor.com/Attraction_Review-${contentId}`
      });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(website || `https://www.tripadvisor.com/Attraction_Review-${contentId}`);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(location);
    }
  };

  const displayPhotos = showAllPhotos ? photos : photos.slice(0, 3);
  const displayReviews = reviews.slice(0, 2);

  return (
    <div 
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      {/* Photos Section */}
      {showPhotos && photos.length > 0 && (
        <div className="relative h-48 rounded-t-lg overflow-hidden">
          <div className="grid grid-cols-3 gap-1 h-full">
            {displayPhotos.map((photo, index) => (
              <div key={index} className="relative">
                <Image
                  src={photo.images?.large?.url || photo.url || '/placeholder-image.jpg'}
                  alt={`${name} photo ${index + 1}`}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.target.src = '/placeholder-image.jpg';
                  }}
                />
              </div>
            ))}
          </div>
          {photos.length > 3 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAllPhotos(!showAllPhotos);
              }}
              className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm"
            >
              {showAllPhotos ? 'Show Less' : `+${photos.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {name}
            </h3>
            <div className="flex items-center mt-1">
              <div className="flex items-center">
                <StarIcon className="h-4 w-4 text-yellow-400" />
                <span className="ml-1 text-sm font-medium text-gray-900">
                  {rating?.toFixed(1) || 'N/A'}
                </span>
                <span className="ml-1 text-sm text-gray-500">
                  ({reviewCount?.toLocaleString() || 0} reviews)
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-1 ml-2">
            <button
              onClick={handleLike}
              className={`p-1 rounded-full transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              }`}
            >
              <HeartIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleShare}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ShareIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Category and Price */}
        <div className="flex items-center space-x-2 mb-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {category || 'Attraction'}
          </span>
          {priceLevel && (
            <span className="text-sm text-gray-600">
              {priceLevel}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Address */}
        {address && (
          <div className="flex items-start mb-2">
            <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
            <span className="text-sm text-gray-600 line-clamp-1">
              {address}
            </span>
          </div>
        )}

        {/* Contact Info */}
        <div className="flex items-center space-x-4 mb-3">
          {phone && (
            <div className="flex items-center">
              <PhoneIcon className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-600">{phone}</span>
            </div>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
            >
              <GlobeAltIcon className="h-4 w-4 mr-1" />
              Website
            </a>
          )}
        </div>

        {/* TripAdvisor Button */}
        {web_url && (
          <div className="mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(web_url, '_blank', 'noopener,noreferrer');
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
            >
              🌟 View on TripAdvisor
            </button>
          </div>
        )}

        {/* Reviews Section */}
        {showReviews && displayReviews.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Reviews</h4>
            <div className="space-y-2">
              {displayReviews.map((review, index) => (
                <div key={index} className="text-sm">
                  <div className="flex items-center mb-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-3 w-3 ${
                            i < (review.rating || 5) ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-xs text-gray-500">
                      {review.published_date ? new Date(review.published_date).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-gray-600 line-clamp-2">
                    &ldquo;{review.text || review.review_text || 'No review text available'}&rdquo;
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    - {review.author?.name || 'Anonymous'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripAdvisorCard;
