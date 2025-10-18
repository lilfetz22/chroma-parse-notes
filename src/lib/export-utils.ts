// src/lib/export-utils.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Strips HTML tags and decodes HTML entities to return plain text
 * @param htmlContent - The HTML content to convert to plain text
 * @returns Plain text content without HTML formatting
 */
export const stripHtmlTags = (htmlContent: string): string => {
  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Get the text content (automatically strips HTML tags)
  let textContent = tempDiv.textContent || tempDiv.innerText || '';
  
  // Clean up extra whitespace and normalize line breaks
  textContent = textContent
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
    .trim();
  
  return textContent;
};

/**
 * Exports note content as a plain text (.txt) file
 * @param content - The HTML content of the note
 * @param title - The title of the note (used as filename)
 */
export const exportNoteAsTxt = (content: string, title: string): void => {
  try {
    // Strip HTML tags and get plain text
    const plainText = stripHtmlTags(content);
    
    // Create a blob with the plain text content
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Sanitize filename and add .txt extension
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled_note';
    link.download = `${sanitizedTitle}.txt`;
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting note as TXT:', error);
    throw new Error('Failed to export note as TXT file');
  }
};

/**
 * Exports note content as a PDF file with preserved formatting
 * @param htmlElement - The DOM element containing the rendered note content
 * @param title - The title of the note (used as filename)
 */
export const exportNoteAsPdf = async (htmlElement: HTMLElement, title: string): Promise<void> => {
  try {
    // Configure html2canvas for high-quality capture
    const canvas = await html2canvas(htmlElement, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // Handle cross-origin images
      allowTaint: true,
      backgroundColor: '#ffffff', // White background
      width: htmlElement.scrollWidth,
      height: htmlElement.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });

    // Get canvas dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    // Create new PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/png');

    // Add the first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if content is longer than one page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Sanitize filename and download
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled_note';
    pdf.save(`${sanitizedTitle}.pdf`);
  } catch (error) {
    console.error('Error exporting note as PDF:', error);
    throw new Error('Failed to export note as PDF file');
  }
};

/**
 * Gets the content element from the RichTextEditor for PDF export
 * @returns The content element or null if not found
 */
export const getNoteContentElement = (): HTMLElement | null => {
  // Look for the content editable div within the RichTextEditor
  const contentElement = document.querySelector('[contenteditable="true"]') as HTMLElement;
  
  if (!contentElement) {
    console.warn('Could not find content editable element for PDF export');
    return null;
  }
  
  return contentElement;
};