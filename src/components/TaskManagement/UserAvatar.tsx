import React from 'react';

interface UserAvatarProps {
  users: string[];
  size?: 'sm' | 'md' | 'lg';
}

const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return 'w-6 h-6 text-xs';
    case 'md':
      return 'w-8 h-8 text-sm';
    case 'lg':
      return 'w-10 h-10 text-base';
    default:
      return 'w-6 h-6 text-xs';
  }
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ users, size = 'md' }) => {
  const sizeClasses = getSizeClasses(size);
  
  if (users.length === 0) {
    return null;
  }

  // If there's only one user, show their avatar
  if (users.length === 1) {
    const user = users[0];
    const initials = user
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .substring(0, 2);
    
    return (
      <div className={`${sizeClasses} rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium`}>
        {initials}
      </div>
    );
  }

  // If there are multiple users, show the first one and a counter
  const firstUser = users[0];
  const firstUserInitials = firstUser
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .substring(0, 2);

  return (
    <div className="flex items-center">
      <div className={`${sizeClasses} rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium`}>
        {firstUserInitials}
      </div>
      {users.length > 1 && (
        <div className={`${sizeClasses} rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium -ml-2`}>
          +{users.length - 1}
        </div>
      )}
    </div>
  );
};