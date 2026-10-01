import {
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';

import {
  getFirestore,
} from 'firebase-admin/firestore';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

export const runtime = 'nodejs';

const getAdminDb = () => {
  const existing =
    getApps()[0];

  const app =
    existing ||
    initializeApp({
      credential: cert({
        projectId:
          process.env
            .FIREBASE_PROJECT_ID,
        clientEmail:
          process.env
            .FIREBASE_CLIENT_EMAIL,
        privateKey:
          process.env
            .FIREBASE_PRIVATE_KEY
            ?.replace(
              /\\n/g,
              '\n'
            ),
      }),
    });

  return getFirestore(app);
};

const normalizeRoomCode = (
  value: unknown
) =>
  String(value || '')
    .toUpperCase()
    .replace(
      /[^A-Z0-9]/g,
      ''
    )
    .slice(0, 6);

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const roomCode =
      normalizeRoomCode(
        body?.roomCode
      );

    const playerId =
      typeof body?.playerId ===
      'string'
        ? body.playerId.trim()
        : '';

    if (
      roomCode.length !== 6 ||
      !playerId ||
      playerId.length > 128
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid leave request.',
        },
        {
          status: 400,
        }
      );
    }

    const db =
      getAdminDb();

    const roomRef =
      db
        .collection(
          'tambayBluffRooms'
        )
        .doc(roomCode);

    const playerRef =
      roomRef
        .collection('players')
        .doc(playerId);

    let deleteWholeRoom =
      false;

    await db.runTransaction(
      async (transaction) => {
        const [
          roomSnapshot,
          playersSnapshot,
        ] =
          await Promise.all([
            transaction.get(
              roomRef
            ),
            transaction.get(
              roomRef
                .collection(
                  'players'
                )
                .orderBy(
                  'joinedAt',
                  'asc'
                )
            ),
          ]);

        if (
          !roomSnapshot.exists
        ) {
          return;
        }

        const roomData =
          roomSnapshot.data() || {};

        const remainingPlayers =
          playersSnapshot.docs.filter(
            (entry) =>
              entry.id !==
              playerId
          );

        transaction.delete(
          playerRef
        );

        if (
          remainingPlayers.length ===
          0
        ) {
          transaction.update(
            roomRef,
            {
              playerCount: 0,
              closing: true,
            }
          );

          deleteWholeRoom =
            true;

          return;
        }

        const updates: {
          playerCount: number;
          closing: boolean;
          hostId?: string;
          hostAlias?: string;
        } = {
          playerCount:
            remainingPlayers.length,
          closing: false,
        };

        if (
          roomData.hostId ===
          playerId
        ) {
          const nextHost =
            remainingPlayers[0];

          updates.hostId =
            nextHost.id;

          updates.hostAlias =
            String(
              nextHost.data()
                .alias ||
                'Anonymous Host'
            );
        }

        transaction.update(
          roomRef,
          updates
        );
      }
    );

    if (deleteWholeRoom) {
      /*
       * Firestore does not automatically delete
       * subcollections when a document is deleted.
       * recursiveDelete removes the room plus its
       * players / answers / votes.
       */
      await db.recursiveDelete(
        roomRef
      );
    }

    return NextResponse.json({
      ok: true,
      roomDeleted:
        deleteWholeRoom,
    });
  } catch (error) {
    console.error(
      'Tambay Bluff leave error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Could not leave the room.',
      },
      {
        status: 500,
      }
    );
  }
}
