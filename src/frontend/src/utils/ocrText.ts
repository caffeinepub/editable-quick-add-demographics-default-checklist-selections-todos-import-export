/**
 * Client-side text extraction from images using browser capabilities
 */

export interface OCRResult {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Check if TextDetector API is available
 */
export function isTextDetectionSupported(): boolean {
  return 'TextDetector' in window;
}

/**
 * Extract text from an image file using the Shape Detection API
 * Note: This API is experimental and only available in Chrome/Edge with flags enabled
 */
export async function extractTextFromImage(imageFile: File): Promise<OCRResult> {
  try {
    // Check if TextDetector is available
    if (!isTextDetectionSupported()) {
      return {
        text: '',
        success: false,
        error: 'Text detection is not supported in your browser. Please use the paste option instead.',
      };
    }

    // Create an image element from the file
    const imageUrl = URL.createObjectURL(imageFile);
    const img = new Image();
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    // Use TextDetector API
    const textDetector = new (window as any).TextDetector();
    const detectedTexts = await textDetector.detect(img);

    // Clean up
    URL.revokeObjectURL(imageUrl);

    if (!detectedTexts || detectedTexts.length === 0) {
      return {
        text: '',
        success: false,
        error: 'No text detected in the image. Please ensure the image contains clear, readable text.',
      };
    }

    // Combine all detected text blocks
    const extractedText = detectedTexts
      .map((textBlock: any) => textBlock.rawValue || '')
      .join('\n');

    return {
      text: extractedText,
      success: true,
    };
  } catch (error) {
    console.error('OCR error:', error);
    return {
      text: '',
      success: false,
      error: 'Failed to extract text from image. Please try again or use the paste option.',
    };
  }
}
