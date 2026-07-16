import React, { useState } from 'react';

const SafeAvatarImage = ({ src, alt = "Avatar", className = "w-full h-full object-cover", fallback }) => {
    const [isError, setIsError] = useState(false);

    if (isError || !src) {
        return fallback;
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setIsError(true)}
        />
    );
};

export default SafeAvatarImage;
