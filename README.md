# QReate - Custom QR Code Generator

QReate is a web application that allows you to generate custom-styled QR codes and export them as SVG files.

## Features

- Generate QR codes from any text or URL
- Customize QR code appearance:
  - Size
  - Foreground/background colors
  - Error correction level
  - Margin options
- Export QR codes as SVG files
- Clean, modern UI

## Development

This project was built with:
- React
- TypeScript
- Vite
- qrcode.react

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open your browser and navigate to http://localhost:5173/

### Building for Production

To build the app for production:

```
npm run build
```

The build artifacts will be located in the `dist` directory.

## Custom QR Code Styling

QReate supports various styling options for your QR codes. For advanced custom styling, you can download the SVG and further modify it in vector graphics software like Adobe Illustrator or Inkscape.

## License

MIT
