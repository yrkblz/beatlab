/**
 * @jest-environment node
 */

import { POST } from '../download-mp3/route';

describe('POST /api/download-mp3', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      RAPIDAPI_KEY: 'test-rapidapi-key',
      RAPIDAPI_HOST: 'youtube-mp36.p.rapidapi.com',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects invalid YouTube URL with 400 status', async () => {
    const req = new Request('http://localhost:3000/api/download-mp3', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://vimeo.com/12345' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Please provide a valid YouTube URL');
  });

  it('correctly extracts video ID from youtu.be link with query parameters', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'ok',
        progress: 100,
        title: 'Beat Track',
        link: 'https://pi.123tokyo.xyz/get.php/sample.mp3',
      }),
    } as any);

    const req = new Request('http://localhost:3000/api/download-mp3', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtu.be/ZSXPoGNOKjI?si=xC9NgE36pSoVRYRR' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe('Beat Track');
    expect(data.link).toBe('https://pi.123tokyo.xyz/get.php/sample.mp3');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/dl?id=ZSXPoGNOKjI'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-rapidapi-key': 'test-rapidapi-key',
          'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
        }),
      })
    );
  });

  it('polls when RapidAPI returns in-progress conversion status until completed', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'processing',
          progress: 50,
          msg: 'in queue',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'ok',
          progress: 100,
          title: 'Finished Beat Track',
          link: 'https://pi.123tokyo.xyz/get.php/finished.mp3',
        }),
      });

    global.fetch = fetchMock as any;

    const req = new Request('http://localhost:3000/api/download-mp3', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=ZSXPoGNOKjI' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe('Finished Beat Track');
    expect(data.link).toBe('https://pi.123tokyo.xyz/get.php/finished.mp3');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns clean error message if RapidAPI returns error or failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'fail',
        msg: 'Video is too long or private.',
      }),
    } as any);

    const req = new Request('http://localhost:3000/api/download-mp3', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtu.be/ZSXPoGNOKjI' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Video is too long or private.');
  });
});
