import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import paper from 'paper'; // Import Paper.js
import { PaperRoundCorners } from 'paperjs-round-corners'; // Import the plugin

type CustomQRCodeProps = {
  value: string;
  size?: number;
  cornerRadius?: number;
};

// Type for QR grid data
type QRGrid = boolean[][];

// Type for a rectangle to be used in path optimization
type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Type for an edge - No longer directly used for path generation with Paper.js, but kept for findOptimizedRectangles structure
type Edge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isHorizontal: boolean;
  id?: number;
};

const CUSTOM_CORNER_DESIGN_WIDTH = 245;
const R = (val: number) => Math.round(val * 1000) / 1000;
const QR_CODE_VIEWBOX_SIZE = 500;

const CustomQRCode: React.FC<CustomQRCodeProps> = ({ value, cornerRadius = 10 }) => {
  const [finderPatternSize, setFinderPatternSize] = useState<number>(145);
  const [cornerPositions, setCornerPositions] = useState({
    topLeft: { x: R(145 / 2), y: R(145 / 2) },
    topRight: { x: R(QR_CODE_VIEWBOX_SIZE - 145 / 2), y: R(145 / 2) },
    bottomLeft: { x: R(145 / 2), y: R(QR_CODE_VIEWBOX_SIZE - 145 / 2) }
  });
  const [isReady, setIsReady] = useState(false);
  const [qrCodePath, setQrCodePath] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null); // For qrcode library
  const paperCanvasRef = useRef<HTMLCanvasElement | null>(null); // For Paper.js offscreen work
  const componentRef = useRef<HTMLDivElement>(null);
  const paperScopeRef = useRef<paper.PaperScope | null>(null);

  useEffect(() => {
    if (!paperCanvasRef.current) {
      paperCanvasRef.current = document.createElement('canvas');
    }
    if (!paperScopeRef.current && paperCanvasRef.current) {
        paperScopeRef.current = new paper.PaperScope();
        paperScopeRef.current.setup(paperCanvasRef.current);
    }

    if (!canvasRef.current || !paperScopeRef.current) return;
    
    const currentPaperScope = paperScopeRef.current; 
    currentPaperScope.project.activeLayer.removeChildren();

    setIsReady(false);
    
    const generateQR = async () => {
      try {
        const qrData = await QRCode.create(value, { errorCorrectionLevel: 'H' });
        const moduleCount = qrData.modules.size;
        const calculatedModuleSize = QR_CODE_VIEWBOX_SIZE / moduleCount;
        const detectedFinderSize = calculatedModuleSize * 7;
        setFinderPatternSize(R(detectedFinderSize));

        setCornerPositions({
          topLeft: { x: R(detectedFinderSize / 2), y: R(detectedFinderSize / 2) },
          topRight: { x: R(QR_CODE_VIEWBOX_SIZE - detectedFinderSize / 2), y: R(detectedFinderSize / 2) },
          bottomLeft: { x: R(detectedFinderSize / 2), y: R(QR_CODE_VIEWBOX_SIZE - detectedFinderSize / 2) }
        });

        const isInFinderPattern = (row: number, col: number) => {
          if (row < 7 && col < 7) return true;
          if (row < 7 && col >= moduleCount - 7) return true;
          if (row >= moduleCount - 7 && col < 7) return true;
          return false;
        };

        const qrGrid: QRGrid = Array(moduleCount).fill(false).map(() => Array(moduleCount).fill(false));
        qrData.modules.data.forEach((isDark, index) => {
          const row = Math.floor(index / moduleCount);
          const col = index % moduleCount;
          if (!isInFinderPattern(row, col) && isDark) {
            qrGrid[row][col] = true;
          }
        });

        const optimizedRects = findOptimizedRectangles(qrGrid, calculatedModuleSize);
        const unitedPath = uniteRectanglesImproved(optimizedRects, currentPaperScope, cornerRadius);
        setQrCodePath(unitedPath);
        setIsReady(true);
      } catch (error) {
        console.error('Error generating QR code with Paper.js:', error);
        setIsReady(false);
      }
    };
    
    generateQR();

  }, [value, cornerRadius]);

  const findOptimizedRectangles = (grid: QRGrid, moduleSize: number): Rect[] => {
    if (grid.length === 0) return [];
    const rowCount = grid.length;
    const colCount = grid[0].length;
    const visited: boolean[][] = Array(rowCount).fill(false).map(() => Array(colCount).fill(false));
    const rectangles: Rect[] = [];

    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        if (!grid[row][col] || visited[row][col]) continue;
        let widthInModules = 1;
        while (col + widthInModules < colCount && grid[row][col + widthInModules] && !visited[row][col + widthInModules]) {
          widthInModules++;
        }
        let heightInModules = 1;
        let canExtend = true;
        while (canExtend && row + heightInModules < rowCount) {
          for (let c = col; c < col + widthInModules; c++) {
            if (!grid[row + heightInModules][c] || visited[row + heightInModules][c]) {
              canExtend = false;
              break;
            }
          }
          if (canExtend) heightInModules++;
        }
        for (let r = row; r < row + heightInModules; r++) {
          for (let c = col; c < col + widthInModules; c++) {
            visited[r][c] = true;
          }
        }
        const startX = R(col * moduleSize);
        const startY = R(row * moduleSize);
        const endX = R((col + widthInModules) * moduleSize);
        const endY = R((row + heightInModules) * moduleSize);
        rectangles.push({ x: startX, y: startY, width: endX - startX, height: endY - startY });
      }
    }
    return rectangles;
  };

  const uniteRectanglesImproved = (rects: Rect[], paperInstance: paper.PaperScope, dynamicCornerRadius: number): string => {
    if (rects.length === 0) return '';
    if (!paperInstance || !paperInstance.project) {
        console.error("Paper.js instance or project not available in uniteRectanglesImproved");
        return rects.map(r => `M${R(r.x)},${R(r.y)}h${R(r.width)}v${R(r.height)}h${R(-r.width)}Z`).join(' ');
    }

    const currentRounding = dynamicCornerRadius > 0 ? dynamicCornerRadius : 0;
    let originalGlobalProject: paper.Project | null = null;

    if (currentRounding > 0) {
      paperInstance.activate(); 
      originalGlobalProject = paper.project;
      paper.project = paperInstance.project;
    }

    const areConnected = (rect1: Rect, rect2: Rect): boolean => {
      const epsilon = 0.0001;
      const r1Right = rect1.x + rect1.width;
      const r1Bottom = rect1.y + rect1.height;
      const r2Right = rect2.x + rect2.width;
      const r2Bottom = rect2.y + rect2.height;
      const touchX = Math.abs(r1Right - rect2.x) < epsilon || Math.abs(r2Right - rect1.x) < epsilon;
      const overlapYForTouchX = (rect1.y < r2Bottom - epsilon) && (r1Bottom > rect2.y + epsilon);
      if (touchX && overlapYForTouchX) return true;
      const touchY = Math.abs(r1Bottom - rect2.y) < epsilon || Math.abs(r2Bottom - rect1.y) < epsilon;
      const overlapXForTouchY = (rect1.x < r2Right - epsilon) && (r1Right > rect2.x + epsilon);
      if (touchY && overlapXForTouchY) return true;
      const directOverlapX = (rect1.x < r2Right - epsilon) && (r1Right > rect2.x + epsilon);
      const directOverlapY = (rect1.y < r2Bottom - epsilon) && (r1Bottom > rect2.y + epsilon);
      return directOverlapX && directOverlapY;
    };

    const findConnectedGroups = (rectangles: Rect[]): Rect[][] => {
      const groups: Rect[][] = [];
      const visited = new Set<number>();
      for (let i = 0; i < rectangles.length; i++) {
        if (visited.has(i)) continue;
        const group: Rect[] = [];
        const queue = [i];
        visited.add(i);
        group.push(rectangles[i]);
        while (queue.length > 0) {
          const currentIdx = queue.shift()!;
          const currentRect = rectangles[currentIdx];
          for (let j = 0; j < rectangles.length; j++) {
            if (currentIdx === j || visited.has(j)) continue;
            if (areConnected(currentRect, rectangles[j])) {
              visited.add(j);
              group.push(rectangles[j]);
              queue.push(j);
            }
          }
        }
        groups.push(group);
      }
      return groups;
    };

    const groups = findConnectedGroups(rects);
    const allPathStrings: string[] = [];
    
    paperInstance.project.activeLayer.removeChildren();

    for (const group of groups) {
      if (group.length === 0) continue;

      if (group.length === 1) {
        const rect = group[0];
        let singleRectPath: paper.PathItem = new paperInstance.Path.Rectangle({
            point: [R(rect.x), R(rect.y)],
            size: [R(rect.width), R(rect.height)]
        });
        if (currentRounding > 0 && singleRectPath instanceof paperInstance.Path && singleRectPath.segments.length > 0) {
            PaperRoundCorners.roundMany(singleRectPath.segments, currentRounding, { method: 'arc' });
        }
        allPathStrings.push(singleRectPath.pathData);
        singleRectPath.remove();
      } else {
        let combinedPath: paper.PathItem | null = null;
        const groupPaperItems: paper.PathItem[] = [];

        for (const rect of group) {
          const paperRectPath = new paperInstance.Path.Rectangle({
            point: [R(rect.x), R(rect.y)],
            size: [R(rect.width), R(rect.height)]
          });
          groupPaperItems.push(paperRectPath);

          if (!combinedPath) {
            combinedPath = paperRectPath;
          } else {
            const result: paper.PathItem = combinedPath.unite(paperRectPath);
            if (combinedPath !== paperRectPath) { 
                 combinedPath.remove(); 
            }
            paperRectPath.remove();
            combinedPath = result;
            if (combinedPath) { 
                 groupPaperItems.push(combinedPath);
            }
          }
        }

        if (combinedPath) {
          if (currentRounding > 0) {
            if (combinedPath instanceof paperInstance.Path && combinedPath.segments.length > 0) {
              PaperRoundCorners.roundMany(combinedPath.segments, currentRounding, { method: 'arc' });
            } else if (combinedPath instanceof paperInstance.CompoundPath) {
              (combinedPath as paper.CompoundPath).children.forEach(childPath => {
                if (childPath instanceof paperInstance.Path && childPath.segments.length > 0) {
                  PaperRoundCorners.roundMany(childPath.segments, currentRounding, { method: 'arc' });
                }
              });
            }
          }
          allPathStrings.push(combinedPath.pathData);
        }
        groupPaperItems.forEach(p => {
            if (p) p.remove();
        });
      }
    }
    
    if (originalGlobalProject !== null && paper.project !== originalGlobalProject) { 
      paper.project = originalGlobalProject;
    }

    return allPathStrings.join(' ');
  };
  
  const displaySize = 500;
  const cornerScale = finderPatternSize > 0 ? R(finderPatternSize / CUSTOM_CORNER_DESIGN_WIDTH) : 1;
  const halfDesignWidth = R(CUSTOM_CORNER_DESIGN_WIDTH / 2);

  const loadingStyle: React.CSSProperties = {
    width: displaySize,
    height: displaySize,
    backgroundColor: '#f5f5f7',
    borderRadius: '8px',
  };

  return (
    <div className="custom-qr-container" ref={componentRef}>
      <canvas ref={canvasRef} width="1015" height="1015" style={{ display: 'none' }}/>
      {!isReady ? (
        <div style={loadingStyle}></div>
      ) : (
        <svg 
          width={displaySize} 
          height={displaySize} 
          viewBox={`0 0 ${QR_CODE_VIEWBOX_SIZE} ${QR_CODE_VIEWBOX_SIZE}`}
          xmlns="http://www.w3.org/2000/svg"
          className="custom-qr-svg"
        >
          <path 
            className="qr-modules-path"
            d={qrCodePath}
            fill="#000000"
            fillRule="evenodd"
            shapeRendering="auto"
          />
          <g 
            transform={`translate(${cornerPositions.topLeft.x}, ${cornerPositions.topLeft.y}) rotate(90) scale(${cornerScale}) translate(-${halfDesignWidth}, -${halfDesignWidth})`} 
            className="corner top-left"
          >
            <path d="M0,65c0,99.4,80.6,180,180,180h25c22.1,0,40-17.9,40-40V40c0-22.1-17.9-40-40-40H40C17.9,0,0,17.9,0,40v25ZM198.2,36.8c5.5,0,10,4.5,10,10v151.5c0,5.5-4.5,10-10,10h-12.5c-82.3,0-149-66.7-149-149v-12.5c0-5.5,4.5-10,10-10h151.5Z" />
            <path d="M165,70h-85c-5.5,0-10,4.5-9.5,10,4.7,50,44.5,89.8,94.5,94.5,5.5.5,10-4,10-9.5v-85c0-5.5-4.5-10-10-10Z" />
          </g>
          <g 
            transform={`translate(${cornerPositions.topRight.x}, ${cornerPositions.topRight.y}) rotate(180) scale(${cornerScale}) translate(-${halfDesignWidth}, -${halfDesignWidth})`} 
            className="corner top-right"
          >
            <path d="M0,65c0,99.4,80.6,180,180,180h25c22.1,0,40-17.9,40-40V40c0-22.1-17.9-40-40-40H40C17.9,0,0,17.9,0,40v25ZM198.2,36.8c5.5,0,10,4.5,10,10v151.5c0,5.5-4.5,10-10,10h-12.5c-82.3,0-149-66.7-149-149v-12.5c0-5.5,4.5-10,10-10h151.5Z" />
            <path d="M165,70h-85c-5.5,0-10,4.5-9.5,10,4.7,50,44.5,89.8,94.5,94.5,5.5.5,10-4,10-9.5v-85c0-5.5-4.5-10-10-10Z" />
          </g>
          <g 
            transform={`translate(${cornerPositions.bottomLeft.x}, ${cornerPositions.bottomLeft.y}) rotate(0) scale(${cornerScale}) translate(-${halfDesignWidth}, -${halfDesignWidth})`} 
            className="corner bottom-left"
          >
            <path d="M0,65c0,99.4,80.6,180,180,180h25c22.1,0,40-17.9,40-40V40c0-22.1-17.9-40-40-40H40C17.9,0,0,17.9,0,40v25ZM198.2,36.8c5.5,0,10,4.5,10,10v151.5c0,5.5-4.5,10-10,10h-12.5c-82.3,0-149-66.7-149-149v-12.5c0-5.5,4.5-10,10-10h151.5Z" />
            <path d="M165,70h-85c-5.5,0-10,4.5-9.5,10,4.7,50,44.5,89.8,94.5,94.5,5.5.5,10-4,10-9.5v-85c0-5.5-4.5-10-10-10Z" />
          </g>
        </svg>
      )}
    </div>
  );
};

export default CustomQRCode; 