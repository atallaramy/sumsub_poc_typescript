import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Sumsub API configuration
const SUMSUB_API_URL = 'https://api.sumsub.com';
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || 'basic-kyc-level';

// Type definitions
interface SumsubApplicantRequest {
  externalUserId: string;
}

interface SumsubApplicantResponse {
  id: string;
  externalUserId: string;
  [key: string]: any;
}

interface SumsubTokenRequest {
  userId: string;
  levelName: string;
  ttlInSecs: number;
  applicantIdentifiers?: Record<string, any>;
}

interface SumsubTokenResponse {
  token: string;
  [key: string]: any;
}

interface AccessTokenRequestBody {
  userId: string;
  levelName?: string;
}

interface AccessTokenResponse {
  token: string;
  applicantId: string;
  userId: string;
}

interface RefreshTokenResponse {
  token: string;
  userId: string;
}

// Function to create HMAC signature for Sumsub API
function createSignature(timestamp: string, method: string, path: string, body: string = ''): string {
  if (!SECRET_KEY) {
    throw new Error('SUMSUB_SECRET_KEY is not configured');
  }
  const message = timestamp + method.toUpperCase() + path + body;
  return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('hex');
}

// Function to make authenticated requests to Sumsub API
async function makeAuthenticatedRequest<T = any>(
  method: string,
  path: string,
  body: any = null
): Promise<T> {
  if (!APP_TOKEN) {
    throw new Error('SUMSUB_APP_TOKEN is not configured');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyString = body ? JSON.stringify(body) : '';
  const signature = createSignature(timestamp, method, path, bodyString);

  const headers = {
    'X-App-Token': APP_TOKEN,
    'X-App-Access-Ts': timestamp,
    'X-App-Access-Sig': signature,
    'Content-Type': 'application/json'
  };

  try {
    // Use dynamic import for ES module compatibility
    const { default: fetch } = await eval(`import('node-fetch')`);
    const response = await fetch(`${SUMSUB_API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sumsub API Error:', response.status, errorText);
      throw new Error(`Sumsub API error: ${response.status} ${errorText}`);
    }

    return await response.json() as T;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

// Generate access token for Web SDK
app.post('/api/access-token', async (req: Request<{}, AccessTokenResponse, AccessTokenRequestBody>, res: Response<AccessTokenResponse>) => {
  try {
    const { userId, levelName } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' } as any);
      return;
    }

    // Use provided level or fall back to environment default
    const selectedLevel = levelName || LEVEL_NAME;

    // Create applicant first, then generate SDK access token (this was working!)
    const uniqueUserId = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log('Creating applicant for user:', uniqueUserId, 'with level:', selectedLevel);

    // Step 1: Create applicant
    const applicantRequest: SumsubApplicantRequest = {
      externalUserId: uniqueUserId
    };
    const applicantResponse = await makeAuthenticatedRequest<SumsubApplicantResponse>(
      'POST',
      `/resources/applicants?levelName=${selectedLevel}`,
      applicantRequest
    );
    const applicantId = applicantResponse.id;
    console.log('Created applicant with ID:', applicantId);

    // Step 2: Generate SDK access token (use userId, not applicantId for SDK!)
    const tokenRequest: SumsubTokenRequest = {
      userId: uniqueUserId,  // SDK tokens need userId, not applicantId
      levelName: selectedLevel,
      ttlInSecs: 1200 // 20 minutes
    };

    console.log('Generating SDK access token...');
    const tokenResponse = await makeAuthenticatedRequest<SumsubTokenResponse>(
      'POST',
      '/resources/accessTokens/sdk',
      tokenRequest
    );

    res.json({
      token: tokenResponse.token,
      applicantId: applicantId,
      userId: uniqueUserId
    });
  } catch (error) {
    console.error('Error generating access token:', error);
    res.status(500).json({
      error: 'Failed to generate access token',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as any);
  }
});

// Refresh access token for existing user
app.post('/api/refresh-token', async (req: Request<{}, RefreshTokenResponse, AccessTokenRequestBody>, res: Response<RefreshTokenResponse>) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' } as any);
      return;
    }

    console.log('Refreshing access token for user:', userId);

    // Generate new SDK access token using userId and levelName
    const tokenRequest: SumsubTokenRequest = {
      userId: userId,
      levelName: LEVEL_NAME,
      ttlInSecs: 1200, // 20 minutes
      applicantIdentifiers: {} // Empty object as required by the API
    };

    const tokenResponse = await makeAuthenticatedRequest<SumsubTokenResponse>(
      'POST',
      '/resources/accessTokens/sdk',
      tokenRequest
    );

    res.json({
      token: tokenResponse.token,
      userId: userId
    });
  } catch (error) {
    console.error('Error refreshing access token:', error);
    res.status(500).json({
      error: 'Failed to refresh access token',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as any);
  }
});

// Get applicant status
app.get('/api/applicant/:applicantId', async (req: Request<{ applicantId: string }>, res: Response) => {
  try {
    const { applicantId } = req.params;
    const response = await makeAuthenticatedRequest('GET', `/resources/applicants/${applicantId}/one`);
    res.json(response);
  } catch (error) {
    console.error('Error fetching applicant:', error);
    res.status(500).json({
      error: 'Failed to fetch applicant',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve the main HTML file
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Sumsub Level: ${LEVEL_NAME}`);
  console.log(`Environment: ${process.env.SUMSUB_ENVIRONMENT || 'sandbox'}`);
});