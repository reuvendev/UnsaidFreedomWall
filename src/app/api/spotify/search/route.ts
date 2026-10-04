import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cachedAccessToken = '';
let accessTokenExpiresAt = 0;

async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Spotify is not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your environment variables.'
    );
  }

  // Reuse the current app token until shortly before it expires.
  if (
    cachedAccessToken &&
    Date.now() < accessTokenExpiresAt
  ) {
    return cachedAccessToken;
  }

  const tokenResponse = await fetch(
    'https://accounts.spotify.com/api/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: 'no-store',
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Spotify token error:', errorText);
    throw new Error('Could not connect to Spotify.');
  }

  const tokenData = await tokenResponse.json();

  cachedAccessToken = tokenData.access_token;

  const expiresInSeconds =
    typeof tokenData.expires_in === 'number'
      ? tokenData.expires_in
      : 3600;

  // Refresh about one minute before Spotify expires the token.
  accessTokenExpiresAt =
    Date.now() + Math.max(expiresInSeconds - 60, 60) * 1000;

  return cachedAccessToken;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
    .get('q')
    ?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Search query must be at least 2 characters.' },
      { status: 400 }
    );
  }

  if (query.length > 100) {
    return NextResponse.json(
      { error: 'Search query is too long.' },
      { status: 400 }
    );
  }

  try {
    const accessToken = await getSpotifyAccessToken();

    const searchParams = new URLSearchParams({
      q: query,
      type: 'track',
      market: 'PH',
      limit: '8',
    });

    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/search?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      }
    );

    if (!spotifyResponse.ok) {
      const errorText = await spotifyResponse.text();
      console.error('Spotify search error:', errorText);

      // Force a fresh app token on the next request if Spotify rejects it.
      if (spotifyResponse.status === 401) {
        cachedAccessToken = '';
        accessTokenExpiresAt = 0;
      }

      return NextResponse.json(
        { error: 'Spotify search is temporarily unavailable.' },
        { status: 502 }
      );
    }

    const data = await spotifyResponse.json();
    const items = Array.isArray(data?.tracks?.items)
      ? data.tracks.items
      : [];

    const tracks = items.map((track: any) => {
      const images = Array.isArray(track?.album?.images)
        ? track.album.images
        : [];

      const smallestImage =
        images.length > 0
          ? images[images.length - 1]?.url || images[0]?.url
          : null;

      return {
        id: track.id,
        name: track.name,
        artists: Array.isArray(track.artists)
          ? track.artists
              .map((artist: any) => artist.name)
              .filter(Boolean)
              .join(', ')
          : '',
        album: track?.album?.name || '',
        imageUrl: smallestImage || null,
        durationMs:
          typeof track.duration_ms === 'number'
            ? track.duration_ms
            : 0,
        explicit: Boolean(track.explicit),
      };
    });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Spotify search route failed:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Spotify search failed.',
      },
      { status: 500 }
    );
  }
}
