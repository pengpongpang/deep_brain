import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Box } from '@mui/material';

interface MermaidChartProps {
  chart: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      // Initialize mermaid with configuration
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        fontSize: 14,
      });

      // Generate unique ID for this chart
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      // Clear previous content
      ref.current.innerHTML = '';
      
      // Render the mermaid chart
      mermaid.render(id, chart)
        .then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        })
        .catch((error) => {
          console.error('Mermaid rendering error:', error);
          if (ref.current) {
            ref.current.innerHTML = `<pre style="color: red; font-size: 12px; padding: 8px; background: #fee; border: 1px solid #fcc; border-radius: 4px;">Mermaid rendering error: ${error.message}</pre>`;
          }
        });
    }
  }, [chart]);

  return (
    <Box
      ref={ref}
      sx={
        {
          '& svg': {
            maxWidth: '100%',
            height: 'auto',
          },
          mb: 2,
        }
      }
    />
  );
};

export default MermaidChart;