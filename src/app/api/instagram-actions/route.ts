import { NextResponse } from 'next/server';
import { InstagramSessionClient } from '@/lib/instagram-session-client';
import { compareInstagramExportData } from '@/lib/instagram-data-importer';

// Follower snapshots in-memory store for unfollower detection
const followerSnapshots = new Map<string, { timestamp: number; followers: string[] }>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, username, userId, recipientUsername, recipientUserId, text, customSessionId, followersData, followingData } = body;

    // ACTION: PARSE OFFICIAL INSTAGRAM EXPORT (100% Exact, Zero Ban Risk)
    if (action === 'parse_export') {
      if (!followersData || !followingData) {
        return NextResponse.json(
          { error: 'Wymagane są dane obu plików: followers_1.json oraz following.json.' },
          { status: 400 }
        );
      }
      const comparison = compareInstagramExportData(followersData, followingData);
      return NextResponse.json({
        success: true,
        source: 'export_file',
        ...comparison,
      });
    }

    let sessionId = (
      customSessionId ||
      process.env.INSTAGRAM_SESSION_ID ||
      ''
    ).trim();

    if (sessionId.toLowerCase().startsWith('sessionid=')) {
      sessionId = sessionId.replace(/^sessionid=/i, '').trim();
    }
    if (sessionId.includes(';')) {
      const sMatch = sessionId.match(/sessionid=([^;]+)/i);
      if (sMatch) sessionId = sMatch[1].trim();
    }

    // Extract dsUserId directly from sessionId if customSessionId is provided or if env has it
    let dsUserId = process.env.INSTAGRAM_DS_USER_ID;
    if (sessionId) {
      const userMatch = sessionId.match(/^(\d+)(?:%3A|:)/);
      if (userMatch) {
        dsUserId = userMatch[1];
      }
    }
    const csrfToken = process.env.INSTAGRAM_CSRF_TOKEN || '';

    const client = new InstagramSessionClient({
      sessionId,
      dsUserId,
      csrfToken,
    });

    // 1. ACTION: UNFOLLOW USER
    if (action === 'unfollow') {
      let targetId = userId;
      if (!targetId && username) {
        targetId = await client.resolveUserId(username);
      }

      if (!targetId) {
        return NextResponse.json(
          { error: `Could not resolve user ID for "${username || userId}"` },
          { status: 400 }
        );
      }

      const unfollowRes = await client.unfollowUser(targetId);
      return NextResponse.json({
        success: unfollowRes.success,
        userId: targetId,
        username: username || '',
        error: unfollowRes.error,
      });
    }

    // 2. ACTION: SEND DM
    if (action === 'send_dm') {
      if (!text || (!recipientUsername && !recipientUserId)) {
        return NextResponse.json(
          { error: 'Missing recipient or message text.' },
          { status: 400 }
        );
      }

      const cleanRecipient = (recipientUsername || '').trim().replace(/^@/, '');
      const directUrl = cleanRecipient
        ? `https://ig.me/m/${cleanRecipient}`
        : recipientUserId
        ? `https://instagram.com/direct/t/${recipientUserId}`
        : 'https://instagram.com/direct/inbox/';

      if (!sessionId) {
        return NextResponse.json({
          success: false,
          directUrl,
          error: 'Brak Session ID. Podaj sessionid w ustawieniach konta lub wyślij wiadomość przez bezpośredni link ig.me.',
        });
      }

      let targetId = recipientUserId;
      if (!targetId && cleanRecipient) {
        targetId = await client.resolveUserId(cleanRecipient);
      }

      if (!targetId) {
        return NextResponse.json({
          success: false,
          directUrl,
          error: 'Nie udało się ustalić ID odbiorcy. Użyj bezpośredniego linku do czatu ig.me.',
        });
      }

      const dmRes = await client.sendDirectMessage(targetId, text);
      return NextResponse.json({
        success: dmRes.success,
        threadId: dmRes.threadId,
        directUrl,
        error: dmRes.error,
      });
    }

    // 3. ACTION: TRACK UNFOLLOWERS (Followers vs Following Analysis)
    if (action === 'track_unfollowers') {
      if (!username) {
        return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
      }

      if (!sessionId) {
        return NextResponse.json(
          {
            error:
              'Brak aktywnego Session ID. Kliknij przycisk „Konto do akcji” u góry strony i wklej swój sessionid z ciasteczek Instagrama.',
            code: 'SESSION_REQUIRED',
          },
          { status: 400 }
        );
      }

      const cleanUsername = username.trim().replace(/^@/, '');
      let targetId = '';

      // If user is tracking their own account and dsUserId is known, use dsUserId
      if (dsUserId && cleanUsername.toLowerCase() === (body.currentAccount || cleanUsername).toLowerCase().replace(/^@/, '')) {
        targetId = dsUserId;
      }

      if (!targetId) {
        targetId = (await client.resolveUserId(cleanUsername)) || '';
      }

      if (!targetId) {
        return NextResponse.json(
          { error: `Nie udało się ustalić ID profilu dla @${cleanUsername}` },
          { status: 404 }
        );
      }

      // Fetch user profile info (to get total followers & following numbers)
      const userProfile = await client.fetchUserProfile(cleanUsername);
      const totalFollowers = userProfile?.followerCount || 0;
      const totalFollowing = userProfile?.followingCount || 0;

      // Dynamically calculate pages to fetch up to 40 pages (2000 users per list)
      const maxPagesFollowers = Math.min(40, Math.ceil(totalFollowers / 50) || 20);
      const maxPagesFollowing = Math.min(40, Math.ceil(totalFollowing / 50) || 20);

      const followersList: { id: string; username: string; fullName: string; profilePicUrl?: string }[] = [];
      const followingList: { id: string; username: string; fullName: string; profilePicUrl?: string }[] = [];
      const seenFollowers = new Set<string>();
      const seenFollowing = new Set<string>();
      let hasFetchError = false;

      try {
        let fCursor: string | undefined = undefined;
        for (let i = 0; i < maxPagesFollowers; i++) {
          try {
            const batch = await client.fetchFollowersBatch(targetId, 50, fCursor);
            for (const u of batch.users) {
              const lower = u.username.toLowerCase();
              if (!seenFollowers.has(lower)) {
                seenFollowers.add(lower);
                followersList.push(u);
              }
            }
            fCursor = batch.nextCursor;
            if (!fCursor || !batch.hasMore) break;
            await new Promise((r) => setTimeout(r, 400));
          } catch (pErr: any) {
            const msg = pErr?.message || '';
            if (
              msg.includes('checkpoint_required') ||
              msg.includes('suspended') ||
              msg.includes('login_required') ||
              msg.includes('401')
            ) {
              throw pErr;
            }
            hasFetchError = true;
            console.warn(`[InstagramActions] Followers pagination stopped early:`, msg);
            break;
          }
        }

        let fwCursor: string | undefined = undefined;
        for (let i = 0; i < maxPagesFollowing; i++) {
          try {
            const batch = await client.fetchFollowingBatch(targetId, 50, fwCursor);
            for (const u of batch.users) {
              const lower = u.username.toLowerCase();
              if (!seenFollowing.has(lower)) {
                seenFollowing.add(lower);
                followingList.push(u);
              }
            }
            fwCursor = batch.nextCursor;
            if (!fwCursor || !batch.hasMore) break;
            await new Promise((r) => setTimeout(r, 400));
          } catch (pErr: any) {
            const msg = pErr?.message || '';
            if (
              msg.includes('checkpoint_required') ||
              msg.includes('suspended') ||
              msg.includes('login_required') ||
              msg.includes('401')
            ) {
              throw pErr;
            }
            hasFetchError = true;
            console.warn(`[InstagramActions] Following pagination stopped early:`, msg);
            break;
          }
        }
      } catch (fetchErr: any) {
        if (
          fetchErr.message?.includes('checkpoint_required') ||
          fetchErr.message?.includes('suspended') ||
          fetchErr.message?.includes('login_required') ||
          fetchErr.message?.includes('401')
        ) {
          return NextResponse.json(
            {
              error:
                'Sesja Instagrama wygasła lub wymaga zatwierdzenia na telefonie (Instagram Checkpoint). Otwórz aplikację Instagram, zatwierdź logowanie i wklej świeży sessionid w panelu powyżej.',
              code: 'CHECKPOINT_REQUIRED',
            },
            { status: 400 }
          );
        }
        throw fetchErr;
      }

      const followersMap = new Map<string, (typeof followersList)[0]>();
      followersList.forEach((u) => followersMap.set(u.username.toLowerCase(), u));

      const followingMap = new Map<string, (typeof followingList)[0]>();
      followingList.forEach((u) => followingMap.set(u.username.toLowerCase(), u));

      const isPartialScan =
        hasFetchError ||
        (totalFollowers > 0 && followersList.length < totalFollowers) ||
        (totalFollowing > 0 && followingList.length < totalFollowing);

      // ACCURACY PROTECTION:
      // If the followers list could not be fully fetched (e.g. stopped at 400 out of 1088 due to rate limit),
      // we must NOT falsely flag the remaining friends as "not following back".
      // We only compute notFollowingBack if followers were fully scanned or if followers count is confirmed.
      const notFollowingBack = isPartialScan
        ? []
        : followingList.filter((u) => !followersMap.has(u.username.toLowerCase()));

      // 2. Fans: people who follow you that you DO NOT follow (always safe to calculate from fetched followers)
      const fans = followersList.filter((u) => !followingMap.has(u.username.toLowerCase()));

      // 3. Unfollowers detection: compare with previous snapshot
      const currentFollowerHandles = Array.from(followersMap.keys());
      const previousSnapshot = followerSnapshots.get(cleanUsername.toLowerCase());

      const unfollowedYou: string[] = [];
      if (!isPartialScan && previousSnapshot && previousSnapshot.followers.length > 0) {
        const currentSet = new Set(currentFollowerHandles);
        for (const prevUser of previousSnapshot.followers) {
          if (!currentSet.has(prevUser)) {
            unfollowedYou.push(prevUser);
          }
        }
      }

      // Update snapshot only on clean scans
      if (!isPartialScan) {
        followerSnapshots.set(cleanUsername.toLowerCase(), {
          timestamp: Date.now(),
          followers: currentFollowerHandles,
        });
      }

      return NextResponse.json({
        success: true,
        account: {
          username: cleanUsername,
          id: targetId,
          totalFollowers: totalFollowers || followersList.length,
          totalFollowing: totalFollowing || followingList.length,
        },
        scannedFollowersCount: followersList.length,
        scannedFollowingCount: followingList.length,
        isPartialScan,
        partialScanReason: isPartialScan
          ? `Pobrano ${followersList.length} z ${totalFollowers || '?'} obserwujących oraz ${followingList.length} z ${totalFollowing || '?'} obserwowanych (ograniczenie limitu zapytań Instagrama). Aby uniknąć oznaczania Twoich znajomych jako 'nie obserwujących zwrotnie', użyj bezpiecznego importu pliku JSON z Instagrama.`
          : undefined,
        notFollowingBack,
        fans,
        unfollowedYou,
        hasPreviousSnapshot: Boolean(previousSnapshot),
      });
    }

    return NextResponse.json({ error: 'Unknown action requested.' }, { status: 400 });
  } catch (err: any) {
    console.error('[InstagramActions API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred processing Instagram action.' },
      { status: 500 }
    );
  }
}
