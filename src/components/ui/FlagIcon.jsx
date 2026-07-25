import React, { useState } from 'react';

/**
 * FlagIcon Component
 * Renders high-quality SVG/PNG country flags from flagcdn.
 * Fixes Windows OS issue where Unicode flag emojis (🇻🇳, 🇺🇸, 🇯🇵, etc.) render as text codes (VN, US, JP).
 */
export const FlagIcon = ({ 
    countryCode, 
    fallbackFlag, 
    className = "w-5 h-3.5 object-cover rounded-sm shadow-xs inline-block align-middle flex-shrink-0" 
}) => {
    const [hasError, setHasError] = useState(false);

    if (!countryCode || hasError) {
        return <span className="select-none leading-none">{fallbackFlag || countryCode?.toUpperCase()}</span>;
    }

    return (
        <img
            src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/w80/${countryCode.toLowerCase()}.png 2x`}
            alt={countryCode}
            onError={() => setHasError(true)}
            className={className}
            loading="lazy"
        />
    );
};

export default FlagIcon;
