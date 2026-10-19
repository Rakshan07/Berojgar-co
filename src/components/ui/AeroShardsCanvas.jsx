import React from 'react';
import AeroShards from './AeroShards';

export default function AeroShardsCanvas({
  shardColor = '#896ABD',    // Aero Shards Violet
  accentColor = '#A855F7',   // Electric Purple
  backgroundColor = 'transparent',
  lightMode = false,
  placement = 'full',
  material = 'glass',
  markers = 'plus',
  count = 1300,
  speed = 1,
  mouseInteraction = true,
  pulseOnClick = true,
  holdToGather = true,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <AeroShards
        shardColor={shardColor}
        accentColor={accentColor}
        backgroundColor={backgroundColor}
        lightMode={lightMode}
        placement={placement}
        material={material}
        markers={markers}
        count={count}
        speed={speed}
        mouseInteraction={mouseInteraction}
        pulseOnClick={pulseOnClick}
        holdToGather={holdToGather}
        className="w-full h-full"
        {...rest}
      />
    </div>
  );
}

