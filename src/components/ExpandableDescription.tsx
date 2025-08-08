'use client';

import React, { useState } from 'react';

interface ExpandableDescriptionProps {
  description: string;
  maxLines?: number;
  className?: string;
}

export default function ExpandableDescription({ 
  description, 
  maxLines = 2, 
  className = '' 
}: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate if description needs truncation
  // Rough estimate: ~40 characters per line for mobile
  const estimatedLines = Math.ceil(description.length / 40);
  const needsTruncation = estimatedLines > maxLines;
  
  // Create truncated version (approximately 80 characters for 2 lines)
  const truncatedDescription = needsTruncation 
    ? description.substring(0, 80).trim() + '...'
    : description;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent book modal from opening
    setIsExpanded(!isExpanded);
  };

  return (
    <span className={className}>
      {isExpanded ? description : truncatedDescription}
      {needsTruncation && (
        <button
          onClick={handleToggle}
          className="text-gray-400 hover:text-white transition-colors ml-1 underline"
        >
          {isExpanded ? 'Read Less' : 'Read More'}
        </button>
      )}
    </span>
  );
}
