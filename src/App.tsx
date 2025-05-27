import { useState } from 'react'
import './App.css'
import CustomQRCode from './components/CustomQRCode'
import downloadIcon from './assets/square.and.arrow.down.svg'
import copyIcon from './assets/document.on.document.svg'

function App() {
  const [text, setText] = useState('https://example.com')
  
  const downloadSVG = () => {
    const container = document.querySelector('.custom-qr-container');
    if (!container) return;
    
    // Get the custom SVG that already has all elements
    const customSvg = container.querySelector('.custom-qr-svg');
    if (!customSvg) return;
    
    // Clone the SVG for download
    const clonedSvg = customSvg.cloneNode(true) as SVGElement;
    
    // Ensure the SVG has proper namespaces
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    
    // Convert to string
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    
    // Create proper SVG document with XML declaration and DOCTYPE
    const svgDoctype = '<?xml version="1.0" standalone="no"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
    const completeData = svgDoctype + '\n' + svgData;
    
    // Create the download blob
    const blob = new Blob([completeData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create filename from the URL
    let filename = text;
    // Remove http:// or https://
    filename = filename.replace(/^https?:\/\//, '');
    // Replace any characters that are not allowed in filenames with hyphens
    filename = filename.replace(/[^a-zA-Z0-9.-]/g, '-');
    // Remove any consecutive hyphens
    filename = filename.replace(/-+/g, '-');
    // Remove leading and trailing hyphens
    filename = filename.replace(/^-+|-+$/g, '');
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${filename}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copySVG = async () => {
    const container = document.querySelector('.custom-qr-container');
    if (!container) return;
    const customSvg = container.querySelector('.custom-qr-svg');
    if (!customSvg) return;
    const clonedSvg = customSvg.cloneNode(true) as SVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgDoctype = '<?xml version="1.0" standalone="no"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
    const completeData = svgDoctype + '\n' + svgData;
    try {
      await navigator.clipboard.writeText(completeData);
    } catch (err) {
      alert('Failed to copy SVG.');
    }
  };
  
  return (
    <div className="container">
      <h1>QReate</h1>
      <div className="qr-container wide">
        <CustomQRCode value={text} />
      </div>
      <div className="controls">
        <div className="input-group">
          {/* <label htmlFor="text-input">URL or Text:</label> */}
          <input 
            id="text-input"
            type="text" 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Enter URL or text"
          />
        </div>
        <div className="icon-row">
          <img
            src={downloadIcon}
            alt="Download SVG"
            className="icon-action icon-download"
            onClick={downloadSVG}
            tabIndex={0}
            role="button"
            aria-label="Download SVG"
          />
          <img
            src={copyIcon}
            alt="Copy SVG"
            className="icon-action icon-copy"
            onClick={copySVG}
            tabIndex={0}
            role="button"
            aria-label="Copy SVG"
          />
        </div>
      </div>
    </div>
  )
}

export default App
