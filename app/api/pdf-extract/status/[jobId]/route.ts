import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

// Use the params argument for type-safe access
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // Properly await params in Next.js 15
  const { jobId } = await params;

  console.log(`[DEBUG] Fetching job status for jobId: ${jobId}`);

  if (!redis) {
    return NextResponse.json(
      { error: 'KV Store not available' },
      { status: 503 } // Service Unavailable
    )
  }

  const jobData = await redis.get(`pdf-job:${jobId}`)

  console.log('[DEBUG] Raw jobData from Redis:', jobData);
  console.log('[DEBUG] typeof jobData:', typeof jobData);

  if (!jobData) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    )
  }

  try {
    // Vercel KV automatically parses JSON, while Upstash Redis returns strings
    // Handle both cases for compatibility
    if (typeof jobData === 'string') {
      // Upstash Redis case - parse the JSON string
      return NextResponse.json(JSON.parse(jobData));
    } else {
      // Vercel KV case - data is already parsed
      return NextResponse.json(jobData);
    }
  } catch (error) {
    console.error('[ERROR] Failed to parse jobData from Redis. Data might be corrupted or not a string:', jobData);
    // Return a structured error response to the client
    return NextResponse.json(
      { error: 'Failed to process job status due to corrupted data.' },
      { status: 500 } // Internal Server Error
    );
  }
}
