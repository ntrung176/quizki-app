import React, { memo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

/**
 * VirtualizedGrid - Component sử dụng react-window để render grid với virtual scrolling
 * Chỉ render các items đang hiển thị, giảm memory và improve performance
 */
export const VirtualizedGrid = memo(({ 
  items, 
  columnCount = 4, 
  rowHeight = 200,
  columnWidth,
  renderItem,
  gap = 16,
  className = ''
}) => {
  // Calculate grid dimensions
  const itemWidth = columnWidth || 250;
  const actualColumnWidth = itemWidth + gap;
  const actualRowHeight = rowHeight + gap;

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= items.length) return null;

    const item = items[index];
    
    return (
      <div
        style={{
          ...style,
          paddingRight: gap,
          paddingBottom: gap,
        }}
      >
        {renderItem({ item, index })}
      </div>
    );
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <AutoSizer>
        {({ height, width }) => {
          const columns = Math.max(1, Math.floor((width + gap) / actualColumnWidth));
          const rows = Math.ceil(items.length / columns);
          
          return (
            <Grid
              columnCount={columns}
              columnWidth={actualColumnWidth}
              height={height}
              rowCount={rows}
              rowHeight={actualRowHeight}
              width={width}
            >
              {Cell}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
});

VirtualizedGrid.displayName = 'VirtualizedGrid';

