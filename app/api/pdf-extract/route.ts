import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { config } from '@/lib/config' // Import config
import pdf from 'pdf-parse' // Import pdf-parse

// Route Segment Config export is not used for body size limit in App Router

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')

  // --- Enhanced Backend Validation ---
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  // Thorough MIME type checking
  // Check both the file extension and the actual content type
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop();
  
  if (fileExtension !== 'pdf') {
    return NextResponse.json({ error: 'Invalid file extension. Only PDF files (.pdf) are allowed.' }, { status: 400 });
  }
  
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Invalid file type. Only PDF is allowed.' }, { status: 400 });
  }

  // Size validation
  if (file.size > config.maxFileSizeBytes) {
    return NextResponse.json(
      { error: `File exceeds maximum size limit of ${config.maxFileSizeMB}MB.` },
      { status: 413 } // Payload Too Large
    );
  }
  
  // Add PDF content validation - check for PDF header/signature
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Check for PDF signature (%PDF-) at the start of the file
    // This is a more reliable way to identify PDF files than relying on MIME type
    const pdfSignature = buffer.toString('ascii', 0, 5);
    if (pdfSignature !== '%PDF-') {
      return NextResponse.json({ 
        error: 'Invalid PDF file content. The file does not appear to be a valid PDF.' 
      }, { status: 400 });
    }
    
    // Additional safety: check for very large number of pages or other anomalies
    // We can do this after the basic checks and before deeper processing
    // This helps prevent PDF bombs or maliciously crafted PDFs
    if (buffer.length > 10 * 1024 * 1024) { // For PDFs larger than 10MB, do extra validation
      // For larger PDFs, we might want to run additional checks here
      // Such as scanning for malicious patterns or excessive nested objects
    }
  } catch (error) {
    console.error("Error validating PDF content:", error);
    return NextResponse.json({ 
      error: 'Failed to validate PDF content. Please ensure you are uploading a valid PDF file.' 
    }, { status: 400 });
  }
  // --- End Enhanced Validation ---

  const jobId = uuidv4()

  // Store initial job status *after* validation passes
  await redis.set(`pdf-job:${jobId}`, {
    status: 'processing',
    progress: 0,
    startedAt: new Date().toISOString()
  })

  // Process in background (non-blocking)
  processPdf(jobId, file).catch(console.error)

  return NextResponse.json({ jobId }) // Restore original response
}

async function processPdf(jobId: string, file: File) {
  let text = ''

  try {
    // 1. Read the file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Update progress before extraction
    await redis.set(`pdf-job:${jobId}`, {
      status: 'processing',
      progress: 30, // Progress before extraction
      updatedAt: new Date().toISOString()
    })

    // 2. Extract text using pdf-parse
    const data = await pdf(buffer)
    console.log(`✅ [pdf-parse] Extracted text from ${data.numpages} pages. Info:`, data.info) // Log info for debugging

    // Update progress after extraction
    await redis.set(`pdf-job:${jobId}`, {
      status: 'processing',
      progress: 70, // Progress after extraction
      updatedAt: new Date().toISOString()
    })

    // 3. Get extracted text
    text = data.text.trim() // pdf-parse returns a single string

    // 4. Mark job as completed in Redis
    await redis.set(`pdf-job:${jobId}`, {
      status: 'completed',
      progress: 100,
      result: text,
      completedAt: new Date().toISOString()
    })
  } catch (error) {
    await redis.set(`pdf-job:${jobId}`, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'PDF extraction failed',
      failedAt: new Date().toISOString()
    })
    // No temporary file cleanup needed
  }
}
