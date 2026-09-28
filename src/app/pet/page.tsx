'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

/* =========================================================
   TYPES
========================================================= */

type PetSpecies =
  | 'cat'
  | 'dog'
  | 'hamster'
  | 'frog'
  | 'chick'
  | 'seal'
  | 'axolotl';

type PetPersonality =
  | 'Chill'
  | 'Clingy'
  | 'Academic Weapon'
  | 'Nonchalant'
  | 'Chaotic'
  | 'Shy';

type AccessorySlot =
  | 'head'
  | 'face'
  | 'neck'
  | 'prop';

type AccessoryRarity =
  | 'Common'
  | 'Rare'
  | 'Epic';

type PetAnimation =
  | 'idle'
  | 'feed'
  | 'play'
  | 'study'
  | 'sleep';

type PetAction =
  Exclude<PetAnimation, 'idle'>;

interface EquippedItems {
  head: string | null;
  face: string | null;
  neck: string | null;
  prop: string | null;
}

interface AccessoryItem {
  id: string;
  name: string;
  description: string;
  slot: AccessorySlot;
  rarity: AccessoryRarity;
  price: number;
}

interface InventoryItem {
  itemId: string;
  acquiredAt?: unknown;
}

interface FoodItem {
  id: string;
  name: string;
  description: string;
  species: PetSpecies | 'all';
  price: number;
  hungerGain: number;
  happinessBonus: number;
}

interface PantryItem {
  foodId: string;
  quantity: number;
  updatedAt?: unknown;
}

interface PetData {
  ownerId: string;

  name: string;

  species: PetSpecies;

  personality: PetPersonality;

  level: number;

  xp: number;

  coins: number;

  hunger: number;

  happiness: number;

  energy: number;

  evolutionStage: number;

  createdAt?: unknown;

  updatedAt?: unknown;

  lastFedAt?: Timestamp | null;

  lastPlayedAt?: Timestamp | null;

  lastStudyAt?: Timestamp | null;

  lastSleptAt?: Timestamp | null;

  lastDailyRewardDate?: string | null;

  dailyRewardDay?: number;

  equipped: EquippedItems;

  lastNeedTickAt?: unknown;

  lastJobAt?: Timestamp | null;

  lastJobId?: string | null;

  jobDate?: string | null;

  jobsCompletedToday?: number;
}

type ParkInteractionType =
  | 'wave'
  | 'play'
  | 'sit'
  | 'treat'
  | 'chat';

type ParkSceneInteractionType =
  Exclude<
    ParkInteractionType,
    'chat'
  >;

interface ParkPet {
  ownerId: string;
  petName: string;
  species: PetSpecies;
  personality: PetPersonality;
  level: number;
  equipped: EquippedItems;
  status: 'online' | 'offline';
  lastSeenAt?: unknown;
}

interface ParkInboxEvent {
  id: string;
  type: ParkInteractionType;
  fromOwnerId?: string | null;
  fromPetName: string;
  fromSpecies: PetSpecies;
  foodId?: string | null;
  foodName?: string | null;
  messagePreview?: string | null;
  createdAt?: unknown;
  seen?: boolean;
}

interface ParkChatMessage {
  id: string;
  senderOwnerId: string;
  senderPetName: string;
  text: string;
  createdAt?: unknown;
}

interface ParkPosition {
  x: number;
  y: number;
  flip: boolean;
}

interface ParkSceneEvent {
  id: number;
  type: ParkSceneInteractionType;
  otherOwnerId: string | null;
  otherPetName: string;
  direction: 'outgoing' | 'incoming';
  foodName?: string | null;
}

const GLOBAL_PARK_CHAT_ID =
  'global';

/*
 * Pet Park chat is daily.
 * A new chat day begins at 12:00 AM in the Philippines.
 * Old documents may remain in Firestore, but the UI/query
 * only reads messages from the current PH calendar day.
 */
const getPhilippineDayStart =
  (
    now = new Date()
  ) => {
    const parts =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Manila',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }
      ).formatToParts(
        now
      );

    const year =
      Number(
        parts.find(
          (part) =>
            part.type ===
            'year'
        )?.value
      );

    const month =
      Number(
        parts.find(
          (part) =>
            part.type ===
            'month'
        )?.value
      );

    const day =
      Number(
        parts.find(
          (part) =>
            part.type ===
            'day'
        )?.value
      );

    /*
     * Philippine Standard Time is UTC+8 year-round.
     * 00:00 PHT = 16:00 UTC on the previous date.
     */
    return new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        -8,
        0,
        0,
        0
      )
    );
  };

const getNextPhilippineMidnight =
  (
    now = new Date()
  ) => {
    const dayStart =
      getPhilippineDayStart(
        now
      );

    return new Date(
      dayStart.getTime() +
        24 * 60 * 60 * 1000
    );
  };

const EMPTY_EQUIPPED: EquippedItems = {
  head: null,
  face: null,
  neck: null,
  prop: null,
};

const ACTION_DIALOGUES: Record<
  PetAction,
  string[]
> = {
  feed: [
    'That was good.',
    'More, please.',
    'Okay, I needed that.',
    'Food makes everything better.',
  ],

  play: [
    'Again!',
    'That was fun.',
    'You almost got me.',
    'One more round?',
  ],

  study: [
    'Focus mode.',
    'One more page.',
    'We can do this.',
    'Okay... I think I get it.',
  ],

  sleep: [
    'Good night.',
    'Five more minutes...',
    'Do not wake me yet.',
    'I am done for today.',
  ],
};

const SPECIES_DIALOGUES:
  Partial<
    Record<
      PetSpecies,
      Partial<
        Record<
          PetAction,
          string[]
        >
      >
    >
  > = {
  seal: {
    play: [
      'Look, I can clap!',
      'Again! Again!',
      'This is my favorite.',
    ],

    feed: [
      'That was delicious.',
      'I was getting hungry.',
    ],
  },

  cat: {
    play: [
      'You call that a chase?',
      'Fine. One more.',
      'I was not having fun. Probably.',
    ],

    sleep: [
      'This spot is mine.',
      'Do not disturb me.',
    ],
  },

  dog: {
    play: [
      'Again! Please!',
      'That was amazing!',
      'I can keep going.',
    ],
  },

  hamster: {
    feed: [
      'More snacks.',
      'I can definitely fit more.',
      'Perfect.',
    ],

    play: [
      'Fast! Faster!',
      'I am unstoppable.',
    ],
  },

  frog: {
    play: [
      'Boing.',
      'Again.',
      'That was acceptable.',
    ],

    study: [
      'Thinking...',
      'Very educational.',
    ],
  },

  chick: {
    play: [
      'Again!',
      'Did you see that?',
      'I can go higher.',
    ],

    feed: [
      'More crumbs, please.',
      'That hit the spot.',
    ],
  },

  axolotl: {
    play: [
      'Splash!',
      'Again, again!',
      'Water zoomies!',
    ],

    feed: [
      'Yum... worm bites.',
      'That was perfect.',
      'More snacks, please.',
    ],

    study: [
      'Tiny brain, big thoughts.',
      'I am absorbing knowledge.',
    ],

    sleep: [
      'Floating to sleep...',
      'Just five more bubbles.',
    ],
  },
};

const getPetDialogue = (
  species: PetSpecies,
  action: PetAction
) => {
  const speciesLines =
    SPECIES_DIALOGUES[
      species
    ]?.[action];

  const pool =
    speciesLines &&
    speciesLines.length > 0
      ? speciesLines
      : ACTION_DIALOGUES[
          action
        ];

  return pool[
    Math.floor(
      Math.random() *
        pool.length
    )
  ];
};

const ACCESSORIES: AccessoryItem[] = [
  {
    id: 'round_glasses',
    name: 'Round Glasses',
    description: 'For serious-looking tambays.',
    slot: 'face',
    rarity: 'Common',
    price: 100,
  },
  {
    id: 'pink_ribbon',
    name: 'Pink Ribbon',
    description: 'Small, cute, and impossible to ignore.',
    slot: 'head',
    rarity: 'Common',
    price: 150,
  },
  {
    id: 'black_headphones',
    name: 'Black Headphones',
    description: 'For pets with their own playlist.',
    slot: 'head',
    rarity: 'Common',
    price: 180,
  },
  {
    id: 'tambay_cap',
    name: 'Tambay Cap',
    description: 'Certified tambay equipment.',
    slot: 'head',
    rarity: 'Rare',
    price: 220,
  },
  {
    id: 'scarf',
    name: 'Scarf',
    description: 'Perfect for Baguio weather.',
    slot: 'neck',
    rarity: 'Rare',
    price: 250,
  },
  {
    id: 'study_book',
    name: 'Study Book',
    description: 'At least one of you is studying.',
    slot: 'prop',
    rarity: 'Rare',
    price: 300,
  },
  {
    id: 'coffee_cup',
    name: 'Coffee Cup',
    description: 'For surviving another day.',
    slot: 'prop',
    rarity: 'Rare',
    price: 350,
  },
  {
    id: 'matcha_cup',
    name: 'Matcha',
    description: 'A cozy little matcha break.',
    slot: 'prop',
    rarity: 'Rare',
    price: 350,
  },
  {
    id: 'graduation_cap',
    name: 'Graduation Cap',
    description: 'A long-term Tambayan flex.',
    slot: 'head',
    rarity: 'Epic',
    price: 800,
  },
];

const FOODS: FoodItem[] = [
  {
    id: 'cat_tuna_crunch',
    name: 'Tuna Crunch',
    description: 'A cat-approved tuna meal.',
    species: 'cat',
    price: 18,
    hungerGain: 32,
    happinessBonus: 6,
  },

  {
    id: 'dog_bone_bites',
    name: 'Bone Bites',
    description: 'Savory little treats for dogs.',
    species: 'dog',
    price: 18,
    hungerGain: 32,
    happinessBonus: 6,
  },

  {
    id: 'hamster_seed_mix',
    name: 'Seed Mix',
    description: 'A tiny bowl packed with seeds.',
    species: 'hamster',
    price: 15,
    hungerGain: 28,
    happinessBonus: 5,
  },

  {
    id: 'frog_fly_bites',
    name: 'Fly Bites',
    description: 'A frog favorite.',
    species: 'frog',
    price: 20,
    hungerGain: 34,
    happinessBonus: 6,
  },

  {
    id: 'chick_grain_mix',
    name: 'Grain Mix',
    description: 'Simple but perfect for a chick.',
    species: 'chick',
    price: 15,
    hungerGain: 28,
    happinessBonus: 5,
  },

  {
    id: 'seal_fish_bucket',
    name: 'Fish Bucket',
    description: 'Exactly what a seal wants.',
    species: 'seal',
    price: 22,
    hungerGain: 36,
    happinessBonus: 7,
  },

  {
    id: 'axolotl_worm_bites',
    name: 'Worm Bites',
    description: 'A soft little snack for an axolotl.',
    species: 'axolotl',
    price: 22,
    hungerGain: 36,
    happinessBonus: 7,
  },

  {
    id: 'emergency_biscuit',
    name: 'Emergency Biscuit',
    description: 'Works for any pet, but not their favorite.',
    species: 'all',
    price: 10,
    hungerGain: 18,
    happinessBonus: 0,
  },
];

const NEED_DECAY_INTERVAL =
  30 * 60 * 1000; // 30 minutes

const HUNGER_DECAY_AMOUNT = 5;

const HAPPINESS_DECAY_AMOUNT = 2;

const ENERGY_DECAY_AMOUNT = 3;

/* =========================================================
   CONSTANTS
========================================================= */

const PETS: {
  id: PetSpecies;
  name: string;
  description: string;
  unlockStreak?: number;
}[] = [
  {
    id: 'cat',
    name: 'Cat',
    description: 'Quiet, curious, and always watching.',
  },
  {
    id: 'dog',
    name: 'Dog',
    description: 'Loyal, energetic, and always ready to play.',
  },
  {
    id: 'hamster',
    name: 'Hamster',
    description: 'Tiny, energetic, and constantly hungry.',
  },
  {
    id: 'frog',
    name: 'Frog',
    description: 'Calm, mysterious, and completely unbothered.',
  },
  {
    id: 'chick',
    name: 'Chick',
    description: 'Small, cheerful, and full of energy.',
  },
  {
    id: 'seal',
    name: 'Seal',
    description: 'Round, relaxed, and professionally adorable.',
  },
  {
    id: 'axolotl',
    name: "Pink Axolotl (Achi's Version)",
    description: 'Soft, aquatic, and unlocked by a 14-day streak.',
    unlockStreak: 14,
  },
];

const PERSONALITIES: PetPersonality[] = [
  'Chill',
  'Clingy',
  'Academic Weapon',
  'Nonchalant',
  'Chaotic',
  'Shy',
];

const ACTIONS = {
  feed: {
    xp: 3,
    coins: 2,
  },

  play: {
    cooldown: 30 * 60 * 1000,
    xp: 5,
    coins: 3,
  },

  study: {
    cooldown: 60 * 60 * 1000,
    xp: 8,
    coins: 5,
  },

  sleep: {
    cooldown: 2 * 60 * 60 * 1000,
    xp: 4,
    coins: 2,
  },
} as const;

const TAMBAY_JOBS = [
  {
    id: 'study_buddy',
    name: 'Study Buddy',
    description: 'Help another tambay focus for a while.',
    coins: 12,
    cooldown: 45 * 60 * 1000,
  },
  {
    id: 'park_cleanup',
    name: 'Park Cleanup',
    description: 'Help keep the Pet Park clean and cozy.',
    coins: 18,
    cooldown: 90 * 60 * 1000,
  },
  {
    id: 'tambayan_helper',
    name: 'Tambayan Helper',
    description: 'Do a small shift helping around Tambayan.',
    coins: 25,
    cooldown: 2 * 60 * 60 * 1000,
  },
] as const;

const MAX_JOBS_PER_DAY = 5;

/* =========================================================
   HELPERS
========================================================= */

const clamp = (
  value: number,
  min = 0,
  max = 100
) => {
  return Math.min(
    max,
    Math.max(min, value)
  );
};

const getPhilippineDate = () => {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(new Date());
};

const getDateDifference = (
  date1: string,
  date2: string
) => {
  const first =
    new Date(
      `${date1}T00:00:00`
    );

  const second =
    new Date(
      `${date2}T00:00:00`
    );

  return Math.round(
    (
      second.getTime() -
      first.getTime()
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
};

const getEffectiveStreak = (
  current: number,
  lastActiveDate:
    string | null
) => {
  if (!lastActiveDate) {
    return 0;
  }

  const difference =
    getDateDifference(
      lastActiveDate,
      getPhilippineDate()
    );

  if (difference <= 1) {
    return current;
  }

  return 0;
};

/* =========================================================
   SHARED TAMBAYAN STREAK

   A successful Feed / Play / Study / Sleep interaction counts
   as the user's activity for the current Philippine calendar day.
   Multiple pet interactions on the same day do NOT add multiple
   streak days.
========================================================= */

const updateUserStreakFromPetInteraction = async (
  userId: string
) => {
  const userRef =
    doc(
      db,
      'users',
      userId
    );

  const today =
    getPhilippineDate();

  return runTransaction(
    db,
    async (transaction) => {
      const userSnapshot =
        await transaction.get(
          userRef
        );

      if (
        !userSnapshot.exists()
      ) {
        transaction.set(
          userRef,
          {
            streak: {
              current: 1,
              longest: 1,
              lastActiveDate:
                today,
            },
          },
          { merge: true }
        );

        return 1;
      }

      const userData =
        userSnapshot.data();

      const existingStreak =
        userData.streak as
          | {
              current?: number;
              longest?: number;
              lastActiveDate?:
                string | null;
            }
          | undefined;

      if (!existingStreak) {
        transaction.set(
          userRef,
          {
            streak: {
              current: 1,
              longest: 1,
              lastActiveDate:
                today,
            },
          },
          { merge: true }
        );

        return 1;
      }

      const current =
        Number(
          existingStreak.current ||
            0
        );

      const longest =
        Number(
          existingStreak.longest ||
            0
        );

      const lastActiveDate =
        existingStreak.lastActiveDate ||
        null;

      /*
       * Already active today.
       * Keep the same streak instead of
       * adding another day.
       */
      if (
        lastActiveDate === today
      ) {
        return current;
      }

      let nextCurrent = 1;

      if (lastActiveDate) {
        const difference =
          getDateDifference(
            lastActiveDate,
            today
          );

        /*
         * Yesterday -> continue streak.
         * Older gap -> restart at 1.
         */
        if (difference === 1) {
          nextCurrent =
            current + 1;
        }
      }

      const nextLongest =
        Math.max(
          longest,
          nextCurrent
        );

      transaction.set(
        userRef,
        {
          streak: {
            current:
              nextCurrent,
            longest:
              nextLongest,
            lastActiveDate:
              today,
          },
        },
        { merge: true }
      );

      return nextCurrent;
    }
  );
};

const getTimestampMillis = (
  value: unknown
): number | null => {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (
    value &&
    typeof value === 'object' &&
    'seconds' in value &&
    typeof (value as { seconds: unknown })
      .seconds === 'number'
  ) {
    return (
      (
        value as {
          seconds: number;
        }
      ).seconds * 1000
    );
  }

  return null;
};

const getFoodMatchLabel = (
  species: PetSpecies,
  food: FoodItem
) => {
  if (food.species === species) {
    return 'Best Match';
  }

  return 'Emergency';
};

const applyPassiveNeedDecay = (
  pet: PetData,
  nowMs = Date.now()
) => {
  const lastTickMs =
    getTimestampMillis(
      pet.lastNeedTickAt
    ) ??
    getTimestampMillis(
      pet.createdAt
    ) ??
    nowMs;

  const elapsedMs =
    nowMs - lastTickMs;

  const ticks =
    Math.floor(
      elapsedMs /
        NEED_DECAY_INTERVAL
    );

  if (ticks <= 0) {
    return {
      changed: false,
      pet,
      nextTickMs:
        lastTickMs,
    };
  }

  let hunger =
    clamp(
      pet.hunger -
        ticks *
          HUNGER_DECAY_AMOUNT
    );

  let happiness =
    clamp(
      pet.happiness -
        ticks *
          HAPPINESS_DECAY_AMOUNT
    );

  let energy =
    clamp(
      pet.energy -
        ticks *
          ENERGY_DECAY_AMOUNT
    );

  /*
   * Extra penalty when hungry.
   */
  if (hunger <= 35) {
    happiness =
      clamp(
        happiness -
          ticks * 1
      );
  }

  if (hunger <= 15) {
    happiness =
      clamp(
        happiness -
          ticks * 2
      );

    energy =
      clamp(
        energy -
          ticks * 2
      );
  }

  if (hunger <= 0) {
    happiness =
      clamp(
        happiness -
          ticks * 3
      );

    energy =
      clamp(
        energy -
          ticks * 3
      );
  }

  /*
   * Important:
   * advance only by completed ticks.
   *
   * This preserves partial time.
   * Example:
   * 45 minutes passed with a
   * 30 minute interval.
   *
   * We consume 30 minutes,
   * but keep the remaining
   * 15 minutes.
   */
  const nextTickMs =
    lastTickMs +
    ticks *
      NEED_DECAY_INTERVAL;

  return {
    changed: true,

    pet: {
      ...pet,
      hunger,
      happiness,
      energy,
    },

    nextTickMs,
  };
};

const getPetOwnerId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    let userId =
      localStorage.getItem(
        'unsaid_chat_user_id'
      );

    if (!userId) {
      userId =
        `user_${Math.random()
          .toString(36)
          .substring(2, 11)}`;

      localStorage.setItem(
        'unsaid_chat_user_id',
        userId
      );
    }

    return userId;
  } catch (error) {
    console.error(
      'Failed to get/create anonymous user ID:',
      error
    );

    return null;
  }
};

const getXpNeeded = (
  level: number
) => {
  return (
    100 +
    (level - 1) * 35
  );
};

const applyXp = (
  level: number,
  xp: number,
  gainedXp: number
) => {
  let nextLevel = level;
  let nextXp =
    xp + gainedXp;

  let levelsGained = 0;

  while (
    nextXp >=
    getXpNeeded(nextLevel)
  ) {
    nextXp -=
      getXpNeeded(nextLevel);

    nextLevel += 1;

    levelsGained += 1;
  }

  return {
    level: nextLevel,
    xp: nextXp,
    levelsGained,
  };
};

const randomPersonality =
  (): PetPersonality => {
    return PERSONALITIES[
      Math.floor(
        Math.random() *
          PERSONALITIES.length
      )
    ];
  };

const timestampToMs = (
  value?: Timestamp | null
) => {
  if (!value) {
    return 0;
  }

  return value.toMillis();
};

const formatCooldown = (
  milliseconds: number
) => {
  if (milliseconds <= 0) {
    return 'Ready';
  }

  const totalMinutes =
    Math.ceil(
      milliseconds / 60000
    );

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};

/* =========================================================
   ICONS
========================================================= */

const Icon = {
  ArrowLeft: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  ),

  Food: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5"
    >
      <path d="M4 11h16" />
      <path d="M6 11c0 5 2.5 8 6 8s6-3 6-8" />
      <path d="M9 6c0-1.5 1-2.5 3-2.5S15 4.5 15 6" />
    </svg>
  ),

  Play: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5"
    >
      <rect
        x="3"
        y="7"
        width="18"
        height="11"
        rx="4"
      />
      <path d="M8 11v4" />
      <path d="M6 13h4" />
      <circle
        cx="16"
        cy="12"
        r="1"
      />
      <circle
        cx="18"
        cy="15"
        r="1"
      />
    </svg>
  ),

  Study: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5"
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21.5z" />
    </svg>
  ),

  Sleep: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5"
    >
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z" />
    </svg>
  ),

  Heart: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-4 h-4"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  ),

  Energy: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-4 h-4"
    >
      <path d="m13 2-9 12h7l-1 8 9-12h-7z" />
    </svg>
  ),

  Hunger: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-4 h-4"
    >
      <path d="M6 3v8" />
      <path d="M3 3v5a3 3 0 0 0 6 0V3" />
      <path d="M6 11v10" />
      <path d="M17 3v18" />
      <path d="M17 3c3 2 3 7 0 9" />
    </svg>
  ),

  Coins: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5"
    >
      <ellipse
        cx="12"
        cy="6"
        rx="7"
        ry="3"
      />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </svg>
  ),

  Gift: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5"
    >
      <rect
        x="3"
        y="8"
        width="18"
        height="13"
        rx="2"
      />
      <path d="M12 8v13" />
      <path d="M3 12h18" />
      <path d="M12 8H7.5A2.5 2.5 0 1 1 10 5.5C10 8 12 8 12 8Z" />
      <path d="M12 8h4.5A2.5 2.5 0 1 0 14 5.5C14 8 12 8 12 8Z" />
    </svg>
  ),

  Spark: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-4 h-4"
    >
      <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" />
    </svg>
  ),
};

function SealPet() {
  return (
    <div className="relative w-[180px] h-[155px]">

      {/* SHADOW */}
      <div className="
        absolute
        left-1/2
        bottom-[2px]
        -translate-x-1/2
        w-[125px]
        h-[18px]
        rounded-full
        bg-black/10
        blur-[3px]
      " />

      {/* LEFT FLIPPER */}
      <div className="
        pet-seal-flipper-left
        absolute
        left-[-2px]
        bottom-[20px]
        w-[58px]
        h-[34px]
        rounded-[80%_30%_70%_40%]
        -rotate-[30deg]
        border
        bg-[#cdd2d5]
        border-[#adb3b7]
        dark:bg-neutral-600
        dark:border-neutral-500
        shadow-sm
      " />

      {/* RIGHT FLIPPER */}
      <div className="
        pet-seal-flipper-right
        absolute
        right-[-2px]
        bottom-[20px]
        w-[58px]
        h-[34px]
        rounded-[30%_80%_40%_70%]
        rotate-[30deg]
        border
        bg-[#cdd2d5]
        border-[#adb3b7]
        dark:bg-neutral-600
        dark:border-neutral-500
        shadow-sm
      " />

      {/* BODY / HEAD */}
      <div className="
        absolute
        left-1/2
        top-[3px]
        -translate-x-1/2
        w-[156px]
        h-[139px]
        rounded-[48%_48%_43%_43%]
        border
        bg-gradient-to-b
        from-[#e8ebed]
        to-[#cbd0d3]
        border-[#b9bec2]
        dark:from-neutral-500
        dark:to-neutral-600
        dark:border-neutral-500
        shadow-lg
      ">

        {/* TOP HIGHLIGHT */}
        <div className="
          absolute
          left-[35px]
          top-[14px]
          w-[45px]
          h-[16px]
          -rotate-12
          rounded-full
          bg-white/60
          dark:bg-white/10
          blur-[1px]
        " />

        {/* FACE LIGHT AREA */}
        <div className="
          absolute
          left-1/2
          top-[59px]
          -translate-x-1/2
          w-[95px]
          h-[58px]
          rounded-[50%]
          bg-[#f2f3f4]
          dark:bg-neutral-500
        " />

        {/* LEFT EYE */}
        <div className="
          pet-eye-blink
          absolute
          left-[40px]
          top-[47px]
          w-[13px]
          h-[16px]
          rounded-full
          bg-neutral-950
          shadow-sm
        ">
          <span className="
            absolute
            left-[3px]
            top-[3px]
            w-[4px]
            h-[4px]
            rounded-full
            bg-white
          " />
        </div>

        {/* RIGHT EYE */}
        <div className="
          pet-eye-blink
          absolute
          right-[40px]
          top-[47px]
          w-[13px]
          h-[16px]
          rounded-full
          bg-neutral-950
          shadow-sm
        ">
          <span className="
            absolute
            left-[3px]
            top-[3px]
            w-[4px]
            h-[4px]
            rounded-full
            bg-white
          " />
        </div>

        {/* LEFT MUZZLE */}
        <div className="
          absolute
          left-[48px]
          top-[73px]
          w-[34px]
          h-[27px]
          rounded-full
          bg-white
          dark:bg-neutral-400
        " />

        {/* RIGHT MUZZLE */}
        <div className="
          absolute
          right-[48px]
          top-[73px]
          w-[34px]
          h-[27px]
          rounded-full
          bg-white
          dark:bg-neutral-400
        " />

        {/* NOSE */}
        <div className="
          absolute
          left-1/2
          top-[70px]
          z-10
          -translate-x-1/2
          w-[17px]
          h-[12px]
          rounded-[50%_50%_65%_65%]
          bg-neutral-900
        " />

        {/* MOUTH */}
        <div className="
          absolute
          left-1/2
          top-[84px]
          z-10
          -translate-x-1/2
        ">
          <span className="
            absolute
            right-[-1px]
            top-0
            w-[15px]
            h-[11px]
            rounded-full
            border-b-2
            border-neutral-700
          " />

          <span className="
            absolute
            left-[-1px]
            top-0
            w-[15px]
            h-[11px]
            rounded-full
            border-b-2
            border-neutral-700
          " />
        </div>

        {/* LEFT WHISKERS */}
        <div className="absolute left-[4px] top-[78px]">
          <span className="absolute w-[40px] h-px bg-neutral-500 -rotate-[10deg]" />
          <span className="absolute top-[9px] w-[42px] h-px bg-neutral-500 rotate-[3deg]" />
          <span className="absolute top-[18px] w-[39px] h-px bg-neutral-500 rotate-[12deg]" />
        </div>

        {/* RIGHT WHISKERS */}
        <div className="absolute right-[4px] top-[78px]">
          <span className="absolute right-0 w-[40px] h-px bg-neutral-500 rotate-[10deg]" />
          <span className="absolute right-0 top-[9px] w-[42px] h-px bg-neutral-500 -rotate-[3deg]" />
          <span className="absolute right-0 top-[18px] w-[39px] h-px bg-neutral-500 -rotate-[12deg]" />
        </div>

      </div>
    </div>
  );
}

function CatPet() {
  return (
    <div className="relative w-[175px] h-[165px]">

      {/* SHADOW */}
      <div
        className="
          absolute
          left-1/2
          bottom-0
          -translate-x-1/2
          w-[120px]
          h-[18px]
          rounded-full
          bg-black/10
          blur-[3px]
        "
      />

      {/* TAIL */}
      <div
        className="
          pet-cat-tail
          absolute
          right-[-9px]
          bottom-[24px]
          z-0
          w-[75px]
          h-[27px]
          origin-left
          rounded-full
          border
          border-[#aa713d]
          bg-gradient-to-r
          from-[#dc9956]
          to-[#c88043]
          dark:border-[#81512e]
          dark:from-[#bd713b]
          dark:to-[#9e592f]
          shadow-sm
        "
      />

      {/* LEFT EAR */}
      <div
        className="
          absolute
          left-[17px]
          top-[3px]
          w-[58px]
          h-[65px]
          rotate-[-15deg]
          rounded-[80%_15%_55%_40%]
          border
          border-[#a76f3f]
          bg-[#d9995e]
          dark:border-[#825531]
          dark:bg-[#bd7844]
        "
      >
        <div
          className="
            absolute
            left-[14px]
            top-[13px]
            w-[28px]
            h-[36px]
            rounded-[80%_20%_55%_40%]
            bg-[#efb5aa]
            dark:bg-[#d79791]
          "
        />
      </div>

      {/* RIGHT EAR */}
      <div
        className="
          absolute
          right-[17px]
          top-[3px]
          w-[58px]
          h-[65px]
          rotate-[15deg]
          rounded-[15%_80%_40%_55%]
          border
          border-[#a76f3f]
          bg-[#d9995e]
          dark:border-[#825531]
          dark:bg-[#bd7844]
        "
      >
        <div
          className="
            absolute
            right-[14px]
            top-[13px]
            w-[28px]
            h-[36px]
            rounded-[20%_80%_40%_55%]
            bg-[#efb5aa]
            dark:bg-[#d79791]
          "
        />
      </div>

      {/* HEAD */}
      <div
        className="
          absolute
          left-1/2
          top-[28px]
          -translate-x-1/2
          w-[150px]
          h-[128px]
          rounded-[47%_47%_44%_44%]
          border
          border-[#aa713d]
          bg-gradient-to-b
          from-[#edb36f]
          via-[#dc9956]
          to-[#c88043]
          dark:border-[#81512e]
          dark:from-[#d18b4c]
          dark:via-[#bd713b]
          dark:to-[#9e592f]
          shadow-lg
        "
      >

        {/* FOREHEAD STRIPE */}
        <div
          className="
            absolute
            left-1/2
            top-[4px]
            -translate-x-1/2
            w-[12px]
            h-[35px]
            rounded-full
            bg-[#b9703a]/40
            dark:bg-[#74401f]/40
          "
        />

        {/* LEFT HEAD STRIPE */}
        <div
          className="
            absolute
            left-[37px]
            top-[7px]
            w-[8px]
            h-[27px]
            rotate-[20deg]
            rounded-full
            bg-[#b9703a]/35
            dark:bg-[#74401f]/35
          "
        />

        {/* RIGHT HEAD STRIPE */}
        <div
          className="
            absolute
            right-[37px]
            top-[7px]
            w-[8px]
            h-[27px]
            -rotate-[20deg]
            rounded-full
            bg-[#b9703a]/35
            dark:bg-[#74401f]/35
          "
        />

        {/* HIGHLIGHT */}
        <div
          className="
            absolute
            left-[25px]
            top-[16px]
            w-[38px]
            h-[12px]
            -rotate-12
            rounded-full
            bg-white/25
          "
        />

        {/* LEFT EYE */}
        <div
          className="
            pet-eye-blink
            absolute
            left-[37px]
            top-[48px]
            w-[14px]
            h-[18px]
            rounded-full
            bg-neutral-950
          "
        >
          <span
            className="
              absolute
              left-[3px]
              top-[3px]
              w-[4px]
              h-[4px]
              rounded-full
              bg-white
            "
          />
        </div>

        {/* RIGHT EYE */}
        <div
          className="
            pet-eye-blink
            absolute
            right-[37px]
            top-[48px]
            w-[14px]
            h-[18px]
            rounded-full
            bg-neutral-950
          "
        >
          <span
            className="
              absolute
              left-[3px]
              top-[3px]
              w-[4px]
              h-[4px]
              rounded-full
              bg-white
            "
          />
        </div>

        {/* MUZZLE */}
        <div
          className="
            absolute
            left-1/2
            top-[68px]
            -translate-x-1/2
            w-[68px]
            h-[44px]
            rounded-[50%]
            bg-[#f6dec7]
            dark:bg-[#e5c3a3]
          "
        />

        {/* NOSE */}
        <div
          className="
            absolute
            left-1/2
            top-[69px]
            z-10
            -translate-x-1/2
            w-[15px]
            h-[11px]
            rounded-[55%_55%_70%_70%]
            bg-[#5c3b36]
          "
        />

        {/* MOUTH */}
        <div
          className="
            absolute
            left-1/2
            top-[80px]
            z-10
            -translate-x-1/2
          "
        >
          <span
            className="
              absolute
              right-0
              w-[13px]
              h-[10px]
              rounded-full
              border-b-2
              border-[#704b42]
            "
          />

          <span
            className="
              absolute
              left-0
              w-[13px]
              h-[10px]
              rounded-full
              border-b-2
              border-[#704b42]
            "
          />
        </div>

        {/* LEFT WHISKERS */}
        <div className="absolute left-[5px] top-[78px]">
          <span className="absolute w-[40px] h-px bg-[#795d4a] -rotate-6" />
          <span className="absolute top-[10px] w-[42px] h-px bg-[#795d4a] rotate-3" />
          <span className="absolute top-[19px] w-[38px] h-px bg-[#795d4a] rotate-[10deg]" />
        </div>

        {/* RIGHT WHISKERS */}
        <div className="absolute right-[5px] top-[78px]">
          <span className="absolute right-0 w-[40px] h-px bg-[#795d4a] rotate-6" />
          <span className="absolute right-0 top-[10px] w-[42px] h-px bg-[#795d4a] -rotate-3" />
          <span className="absolute right-0 top-[19px] w-[38px] h-px bg-[#795d4a] -rotate-[10deg]" />
        </div>

      </div>

      {/* LEFT PAW */}
      <div
        className="
          pet-cat-paw-left
          absolute
          left-[42px]
          bottom-[2px]
          z-20
          w-[42px]
          h-[29px]
          rotate-[7deg]
          rounded-[55%_55%_48%_48%]
          border
          border-[#a96c3c]
          bg-gradient-to-b
          from-[#e3a25f]
          to-[#c77b40]
          dark:border-[#81512e]
          dark:from-[#c47b43]
          dark:to-[#9e592f]
          shadow-sm
        "
      >
        {/* TOES */}
        <span
          className="
            absolute
            left-[10px]
            bottom-[5px]
            w-[7px]
            h-[5px]
            rounded-full
            border-b
            border-[#9f6338]
            dark:border-[#74401f]
          "
        />

        <span
          className="
            absolute
            left-[19px]
            bottom-[4px]
            w-[7px]
            h-[5px]
            rounded-full
            border-b
            border-[#9f6338]
            dark:border-[#74401f]
          "
        />

        <span
          className="
            absolute
            right-[7px]
            bottom-[6px]
            w-[6px]
            h-[5px]
            rounded-full
            border-b
            border-[#9f6338]
            dark:border-[#74401f]
          "
        />
      </div>

      {/* RIGHT PAW */}
      <div
        className="
          pet-cat-paw-right
          absolute
          right-[42px]
          bottom-[2px]
          z-20
          w-[42px]
          h-[29px]
          -rotate-[7deg]
          rounded-[55%_55%_48%_48%]
          border
          border-[#a96c3c]
          bg-gradient-to-b
          from-[#e3a25f]
          to-[#c77b40]
          dark:border-[#81512e]
          dark:from-[#c47b43]
          dark:to-[#9e592f]
          shadow-sm
        "
      >
        {/* TOES */}
        <span
          className="
            absolute
            left-[7px]
            bottom-[6px]
            w-[6px]
            h-[5px]
            rounded-full
            border-b
            border-[#9f6338]
            dark:border-[#74401f]
          "
        />

        <span
          className="
            absolute
            left-[16px]
            bottom-[4px]
            w-[7px]
            h-[5px]
            rounded-full
            border-b
            border-[#9f6338]
            dark:border-[#74401f]
          "
        />

        <span
          className="
            absolute
            right-[10px]
            bottom-[5px]
            w-[7px]
            h-[5px]
            rounded-full
            border-b
            border-[#9f6338]
            dark:border-[#74401f]
          "
        />
      </div>
    </div>
  );
}

function DogPet() {
  return (
    <div className="relative w-[180px] h-[165px]">

      <div className="
        absolute left-1/2 bottom-0
        -translate-x-1/2
        w-[125px] h-[18px]
        rounded-full bg-black/10 blur-[3px]
      " />

      {/* LEFT EAR */}
      <div className="
        pet-dog-ear-left
        absolute
        left-[4px]
        top-[32px]
        w-[54px]
        h-[90px]
        rounded-[70%_35%_70%_60%]
        bg-[#8d684d]
        dark:bg-neutral-700
        border
        border-[#74523b]
        dark:border-neutral-600
        rotate-[15deg]
      " />

      {/* RIGHT EAR */}
      <div className="
        pet-dog-ear-right
        absolute
        right-[4px]
        top-[32px]
        w-[54px]
        h-[90px]
        rounded-[35%_70%_60%_70%]
        bg-[#8d684d]
        dark:bg-neutral-700
        border
        border-[#74523b]
        dark:border-neutral-600
        -rotate-[15deg]
      " />

      {/* HEAD */}
      <div className="
        absolute
        left-1/2 top-[22px]
        -translate-x-1/2
        w-[145px] h-[132px]
        rounded-[48%_48%_44%_44%]
        bg-gradient-to-b
        from-[#c99c73]
        to-[#aa7955]
        dark:from-neutral-500
        dark:to-neutral-600
        border border-[#966846]
        dark:border-neutral-500
        shadow-lg
      ">

        {/* FOREHEAD PATCH */}
        <div className="
          absolute left-1/2 top-[4px]
          -translate-x-1/2
          w-[45px] h-[55px]
          bg-[#e7c6a3]
          dark:bg-neutral-400
          rounded-[45%_45%_55%_55%]
          opacity-70
        " />

        {/* EYES */}
        <div className="absolute left-[34px] top-[48px] w-[14px] h-[17px] rounded-full bg-neutral-950">
          <span className="absolute left-[3px] top-[3px] w-[4px] h-[4px] rounded-full bg-white" />
        </div>

        <div className="absolute right-[34px] top-[48px] w-[14px] h-[17px] rounded-full bg-neutral-950">
          <span className="absolute left-[3px] top-[3px] w-[4px] h-[4px] rounded-full bg-white" />
        </div>

        {/* SNOUT */}
        <div className="
          absolute
          left-1/2
          top-[68px]
          -translate-x-1/2
          w-[72px]
          h-[48px]
          rounded-[50%]
          bg-[#e6c5a4]
          dark:bg-neutral-400
        " />

        {/* NOSE */}
        <div className="
          absolute
          left-1/2
          top-[69px]
          -translate-x-1/2
          w-[22px]
          h-[15px]
          rounded-[50%_50%_65%_65%]
          bg-neutral-900
          z-10
        " />

        {/* MOUTH */}
        <div className="
          absolute
          left-1/2
          top-[89px]
          -translate-x-1/2
          w-[26px]
          h-[12px]
          rounded-b-full
          border-b-2
          border-neutral-700
        " />

      </div>
    </div>
  );
}

function HamsterPet() {
  return (
    <div className="relative w-[180px] h-[165px]">

      {/* SHADOW */}
      <div
        className="
          absolute
          left-1/2
          bottom-[1px]
          -translate-x-1/2
          w-[120px]
          h-[17px]
          rounded-full
          bg-black/10
          blur-[3px]
        "
      />

      {/* LEFT EAR */}
      <div
        className="
          absolute
          left-[29px]
          top-[17px]
          z-[1]
          w-[42px]
          h-[42px]
          rounded-full
          border
          border-[#a86f45]
          bg-[#ca8c5b]
          dark:border-[#825136]
          dark:bg-[#a96a43]
        "
      >
        <div
          className="
            absolute
            inset-[8px]
            rounded-full
            bg-[#e9aea4]
            dark:bg-[#c9827b]
          "
        />
      </div>

      {/* RIGHT EAR */}
      <div
        className="
          absolute
          right-[29px]
          top-[17px]
          z-[1]
          w-[42px]
          h-[42px]
          rounded-full
          border
          border-[#a86f45]
          bg-[#ca8c5b]
          dark:border-[#825136]
          dark:bg-[#a96a43]
        "
      >
        <div
          className="
            absolute
            inset-[8px]
            rounded-full
            bg-[#e9aea4]
            dark:bg-[#c9827b]
          "
        />
      </div>

      {/* ROUND BODY */}
      <div
        className="
          absolute
          left-1/2
          top-[29px]
          z-[2]
          -translate-x-1/2
          w-[150px]
          h-[128px]
          rounded-[48%_48%_46%_46%]
          border
          border-[#a96f42]
          bg-gradient-to-b
          from-[#dea067]
          via-[#cd8952]
          to-[#b87547]
          dark:border-[#805033]
          dark:from-[#c07b4d]
          dark:via-[#a9623c]
          dark:to-[#8d5035]
          shadow-lg
        "
      >

        {/* FOREHEAD LIGHT PATCH */}
        <div
          className="
            absolute
            left-1/2
            top-[4px]
            -translate-x-1/2
            w-[54px]
            h-[66px]
            rounded-[45%_45%_55%_55%]
            bg-[#e9bb88]/55
            dark:bg-[#d39b6d]/40
          "
        />

        {/* LEFT EYE */}
        <div
          className="
            absolute
            left-[37px]
            top-[38px]
            z-10
            w-[14px]
            h-[17px]
            rounded-full
            bg-neutral-950
          "
        >
          <span
            className="
              absolute
              left-[3px]
              top-[3px]
              w-[4px]
              h-[4px]
              rounded-full
              bg-white
            "
          />
        </div>

        {/* RIGHT EYE */}
        <div
          className="
            absolute
            right-[37px]
            top-[38px]
            z-10
            w-[14px]
            h-[17px]
            rounded-full
            bg-neutral-950
          "
        >
          <span
            className="
              absolute
              left-[3px]
              top-[3px]
              w-[4px]
              h-[4px]
              rounded-full
              bg-white
            "
          />
        </div>

        {/* LEFT CHEEK POUCH */}
        <div
          className="
            absolute
            left-[10px]
            top-[56px]
            w-[59px]
            h-[55px]
            rounded-[55%]
            bg-[#f1d7ba]
            dark:bg-[#d4ad87]
          "
        />

        {/* RIGHT CHEEK POUCH */}
        <div
          className="
            absolute
            right-[10px]
            top-[56px]
            w-[59px]
            h-[55px]
            rounded-[55%]
            bg-[#f1d7ba]
            dark:bg-[#d4ad87]
          "
        />

        {/* LEFT BLUSH */}
        <div
          className="
            absolute
            left-[19px]
            top-[72px]
            z-10
            w-[25px]
            h-[13px]
            rounded-full
            bg-[#df8e84]/45
          "
        />

        {/* RIGHT BLUSH */}
        <div
          className="
            absolute
            right-[19px]
            top-[72px]
            z-10
            w-[25px]
            h-[13px]
            rounded-full
            bg-[#df8e84]/45
          "
        />

        {/* CENTER MUZZLE */}
        <div
          className="
            absolute
            left-1/2
            top-[57px]
            z-[5]
            -translate-x-1/2
            w-[52px]
            h-[49px]
            rounded-[50%]
            bg-[#f8e8d5]
            dark:bg-[#dfc3a4]
          "
        />

        {/* NOSE */}
        <div
          className="
            absolute
            left-1/2
            top-[59px]
            z-20
            -translate-x-1/2
            w-[12px]
            h-[9px]
            rounded-[55%_55%_65%_65%]
            bg-[#6b433d]
          "
        />

        {/* MOUTH */}
        <div
          className="
            absolute
            left-1/2
            top-[69px]
            z-20
            -translate-x-1/2
          "
        >
          <span
            className="
              absolute
              right-[-1px]
              w-[10px]
              h-[8px]
              rounded-full
              border-b
              border-[#77544a]
            "
          />

          <span
            className="
              absolute
              left-[-1px]
              w-[10px]
              h-[8px]
              rounded-full
              border-b
              border-[#77544a]
            "
          />
        </div>

        {/* LITTLE TEETH */}
        <div
          className="
            absolute
            left-1/2
            top-[78px]
            z-20
            -translate-x-1/2
            flex
            gap-[1px]
          "
        >
          <div
            className="
              w-[6px]
              h-[9px]
              rounded-b-[2px]
              border
              border-neutral-200
              bg-white
            "
          />

          <div
            className="
              w-[6px]
              h-[9px]
              rounded-b-[2px]
              border
              border-neutral-200
              bg-white
            "
          />
        </div>

        {/* WHITE BELLY */}
        <div
          className="
            absolute
            left-1/2
            bottom-[-2px]
            -translate-x-1/2
            w-[74px]
            h-[50px]
            rounded-t-[50%]
            rounded-b-[45%]
            bg-[#f4dfc8]
            dark:bg-[#d3ae8b]
          "
        />

        {/* LEFT PAW */}
        <div
          className="
            pet-hamster-paw-left
            absolute
            left-[47px]
            bottom-[17px]
            z-20
            w-[25px]
            h-[19px]
            rotate-[14deg]
            rounded-[60%]
            bg-[#e8c09d]
            dark:bg-[#c99570]
            border
            border-[#c99c79]
            dark:border-[#a8795d]
          "
        />

        {/* RIGHT PAW */}
        <div
          className="
            pet-hamster-paw-right
            absolute
            right-[47px]
            bottom-[17px]
            z-20
            w-[25px]
            h-[19px]
            -rotate-[14deg]
            rounded-[60%]
            bg-[#e8c09d]
            dark:bg-[#c99570]
            border
            border-[#c99c79]
            dark:border-[#a8795d]
          "
        />

        {/* HEAD HIGHLIGHT */}
        <div
          className="
            absolute
            left-[28px]
            top-[13px]
            w-[35px]
            h-[11px]
            -rotate-12
            rounded-full
            bg-white/25
          "
        />
      </div>
    </div>
  );
}

function FrogPet() {
  return (
    <div className="relative w-[180px] h-[150px]">

      <div className="
        absolute left-1/2 bottom-0
        -translate-x-1/2
        w-[125px] h-[18px]
        rounded-full bg-black/10 blur-[3px]
      " />

      {/* BODY */}
      <div className="
        absolute
        left-1/2
        bottom-[8px]
        -translate-x-1/2
        w-[160px]
        h-[115px]
        rounded-[48%_48%_42%_42%]
        bg-gradient-to-b
        from-[#86c97b]
        to-[#64ad62]
        border border-[#55964f]
        dark:from-[#426b49]
        dark:to-[#35563d]
        dark:border-[#4c7552]
        shadow-lg
      " />

      {/* LEFT EYE BUMP */}
      <div className="
        absolute
        left-[25px]
        top-[3px]
        w-[60px]
        h-[60px]
        rounded-full
        bg-[#85c97a]
        border border-[#55964f]
        dark:bg-[#426b49]
        dark:border-[#4c7552]
      ">
        <div className="
          absolute inset-[12px]
          rounded-full bg-[#f3f1d8]
        ">
          <div className="
  pet-eye-blink
  absolute
  left-1/2
  top-1/2
  -translate-x-1/2
  -translate-y-1/2
  w-[12px]
  h-[18px]
  rounded-full
  bg-neutral-950
">
            <span className="absolute left-[3px] top-[3px] w-[3px] h-[3px] rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* RIGHT EYE BUMP */}
      <div className="
        absolute
        right-[25px]
        top-[3px]
        w-[60px]
        h-[60px]
        rounded-full
        bg-[#85c97a]
        border border-[#55964f]
        dark:bg-[#426b49]
        dark:border-[#4c7552]
      ">
        <div className="
          absolute inset-[12px]
          rounded-full bg-[#f3f1d8]
        ">
          <div className="
            pet-eye-blink
            absolute
            left-1/2
            top-1/2
            -translate-x-1/2
            -translate-y-1/2
            w-[12px]
            h-[18px]
            rounded-full
            bg-neutral-950
          ">
            <span className="absolute left-[3px] top-[3px] w-[3px] h-[3px] rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* MOUTH */}
      <div className="
        absolute
        left-1/2
        bottom-[40px]
        -translate-x-1/2
        w-[55px]
        h-[22px]
        rounded-b-full
        border-b-[3px]
        border-[#396c3c]
        dark:border-[#86b68b]
      " />

      {/* CHEEKS */}
      <div className="absolute left-[35px] bottom-[43px] w-[24px] h-[13px] rounded-full bg-[#e48f8f]/30" />
      <div className="absolute right-[35px] bottom-[43px] w-[24px] h-[13px] rounded-full bg-[#e48f8f]/30" />

    </div>
  );
}

function ChickPet() {
  return (
    <div className="relative w-[165px] h-[160px]">

      <div className="
        absolute left-1/2 bottom-0
        -translate-x-1/2
        w-[110px] h-[17px]
        rounded-full bg-black/10 blur-[3px]
      " />

      {/* LEFT WING */}
      <div
        className="
          pet-hamster-paw-right
          absolute
          right-[47px]
          bottom-[17px]
          z-20
          w-[25px]
          h-[19px]
          -rotate-[14deg]
          rounded-[60%]
          bg-[#e8c09d]
          dark:bg-[#c99570]
          border
          border-[#c99c79]
          dark:border-[#a8795d]
        "
      />

      {/* RIGHT WING */}
      <div className="
        pet-chick-wing-right
        absolute
        right-[5px]
        top-[73px]
        w-[55px]
        h-[42px]
        rounded-[30%_80%_40%_60%]
        rotate-[20deg]
        bg-[#edc844]
        border
        border-[#d0aa30]
        dark:bg-[#9b8338]
        dark:border-[#806c30]
      " />

      {/* BODY */}
      <div className="
        absolute
        left-1/2
        top-[25px]
        -translate-x-1/2
        w-[135px]
        h-[125px]
        rounded-[50%_50%_45%_45%]
        bg-gradient-to-b
        from-[#f8da62]
        to-[#eabc35]
        border border-[#d1a82c]
        dark:from-[#a78d3c]
        dark:to-[#89732f]
        dark:border-[#776329]
        shadow-lg
      ">

        {/* FEATHER */}
        <div className="
          absolute
          left-[57px]
          top-[-20px]
          w-[15px]
          h-[32px]
          rounded-full
          bg-[#f1cf4b]
          dark:bg-[#927a34]
          -rotate-[18deg]
        " />

        <div className="
          absolute
          left-[70px]
          top-[-17px]
          w-[13px]
          h-[28px]
          rounded-full
          bg-[#f1cf4b]
          dark:bg-[#927a34]
          rotate-[15deg]
        " />

        {/* EYES */}
        <div className="absolute left-[33px] top-[44px] w-[13px] h-[16px] rounded-full bg-neutral-950">
          <span className="absolute left-[3px] top-[3px] w-[4px] h-[4px] rounded-full bg-white" />
        </div>

        <div className="absolute right-[33px] top-[44px] w-[13px] h-[16px] rounded-full bg-neutral-950">
          <span className="absolute left-[3px] top-[3px] w-[4px] h-[4px] rounded-full bg-white" />
        </div>

        {/* BEAK */}
        <div className="
          absolute
          left-1/2
          top-[66px]
          -translate-x-1/2
          w-0 h-0
          border-l-[13px]
          border-r-[13px]
          border-t-[17px]
          border-l-transparent
          border-r-transparent
          border-t-[#e99032]
        " />

        {/* CHEEKS */}
        <div className="absolute left-[22px] top-[69px] w-[25px] h-[14px] rounded-full bg-[#ee9a8e]/40" />
        <div className="absolute right-[22px] top-[69px] w-[25px] h-[14px] rounded-full bg-[#ee9a8e]/40" />

      </div>

      {/* FEET */}
      <div className="absolute left-[51px] bottom-[-1px] w-[27px] h-[5px] rounded-full bg-[#df8d2f]" />
      <div className="absolute right-[51px] bottom-[-1px] w-[27px] h-[5px] rounded-full bg-[#df8d2f]" />

    </div>
  );
}

function AxolotlPet() {
  return (
    <div className="relative w-[195px] h-[170px]">

      {/* SOFT SHADOW */}
      <div
        className="
          absolute
          left-1/2
          bottom-[1px]
          -translate-x-1/2
          w-[132px]
          h-[18px]
          rounded-full
          bg-pink-950/10
          blur-[4px]
        "
      />

      {/* FLOATING BUBBLES */}
      <span
        className="
          axolotl-bubble
          absolute
          left-[17px]
          top-[17px]
          z-10
          h-[10px]
          w-[10px]
          rounded-full
          border
          border-pink-300/70
          bg-white/50
        "
      />

      <span
        className="
          axolotl-bubble
          axolotl-bubble-delay
          absolute
          right-[21px]
          top-[4px]
          z-10
          h-[7px]
          w-[7px]
          rounded-full
          border
          border-pink-300/70
          bg-white/50
        "
      />

      {/* TAIL */}
      <div
        className="
          axolotl-tail
          absolute
          right-[-1px]
          bottom-[26px]
          z-[1]
          w-[83px]
          h-[39px]
          origin-left
          rotate-[8deg]
          rounded-[60%_95%_95%_46%]
          border
          border-[#dc86a2]
          bg-gradient-to-r
          from-[#f5aec3]
          via-[#f3a1ba]
          to-[#e987a6]
          shadow-sm
        "
      >
        <div
          className="
            absolute
            right-[8px]
            top-[6px]
            h-[24px]
            w-[42px]
            rounded-[65%_95%_95%_65%]
            bg-[#ffd0dd]/65
          "
        />

        <div
          className="
            absolute
            right-[14px]
            top-[8px]
            h-[7px]
            w-[26px]
            -rotate-[8deg]
            rounded-full
            bg-white/35
          "
        />
      </div>

      {/* BACK LEGS */}
      <div
        className="
          absolute
          left-[39px]
          bottom-[9px]
          z-[4]
          h-[27px]
          w-[42px]
          rotate-[13deg]
          rounded-[60%_60%_48%_48%]
          border
          border-[#db829f]
          bg-gradient-to-b
          from-[#f6b0c4]
          to-[#eb93ae]
          shadow-sm
        "
      >
        <span className="absolute bottom-[4px] left-[10px] h-[5px] w-[6px] rounded-full border-b border-[#ce728f]" />
        <span className="absolute bottom-[3px] left-[18px] h-[5px] w-[6px] rounded-full border-b border-[#ce728f]" />
        <span className="absolute bottom-[4px] left-[26px] h-[5px] w-[6px] rounded-full border-b border-[#ce728f]" />
      </div>

      <div
        className="
          absolute
          right-[39px]
          bottom-[9px]
          z-[4]
          h-[27px]
          w-[42px]
          -rotate-[13deg]
          rounded-[60%_60%_48%_48%]
          border
          border-[#db829f]
          bg-gradient-to-b
          from-[#f6b0c4]
          to-[#eb93ae]
          shadow-sm
        "
      >
        <span className="absolute bottom-[4px] left-[10px] h-[5px] w-[6px] rounded-full border-b border-[#ce728f]" />
        <span className="absolute bottom-[3px] left-[18px] h-[5px] w-[6px] rounded-full border-b border-[#ce728f]" />
        <span className="absolute bottom-[4px] left-[26px] h-[5px] w-[6px] rounded-full border-b border-[#ce728f]" />
      </div>

      {/* LEFT FEATHERY GILLS */}
      <div
        className="
          axolotl-gill-left
          absolute
          left-[1px]
          top-[37px]
          z-[2]
          h-[70px]
          w-[64px]
          origin-right
        "
      >
        <div className="absolute right-[3px] top-[29px] h-[11px] w-[48px] rotate-[4deg] rounded-full bg-[#d75d85]" />
        <div className="absolute right-[6px] top-[11px] h-[10px] w-[49px] -rotate-[23deg] rounded-full bg-[#dc668d]" />
        <div className="absolute right-[6px] top-[47px] h-[10px] w-[49px] rotate-[24deg] rounded-full bg-[#dc668d]" />

        <span className="absolute left-[2px] top-[2px] h-[13px] w-[24px] -rotate-[25deg] rounded-full bg-[#f080a3]" />
        <span className="absolute left-[-4px] top-[18px] h-[13px] w-[25px] -rotate-[10deg] rounded-full bg-[#f48cab]" />
        <span className="absolute left-[-5px] top-[35px] h-[13px] w-[25px] rotate-[4deg] rounded-full bg-[#f48cab]" />
        <span className="absolute left-[1px] top-[52px] h-[13px] w-[24px] rotate-[24deg] rounded-full bg-[#f080a3]" />

        <span className="absolute left-[7px] top-[5px] h-[5px] w-[9px] rounded-full bg-white/35" />
        <span className="absolute left-[1px] top-[21px] h-[5px] w-[10px] rounded-full bg-white/30" />
      </div>

      {/* RIGHT FEATHERY GILLS */}
      <div
        className="
          axolotl-gill-right
          absolute
          right-[1px]
          top-[37px]
          z-[2]
          h-[70px]
          w-[64px]
          origin-left
        "
      >
        <div className="absolute left-[3px] top-[29px] h-[11px] w-[48px] -rotate-[4deg] rounded-full bg-[#d75d85]" />
        <div className="absolute left-[6px] top-[11px] h-[10px] w-[49px] rotate-[23deg] rounded-full bg-[#dc668d]" />
        <div className="absolute left-[6px] top-[47px] h-[10px] w-[49px] -rotate-[24deg] rounded-full bg-[#dc668d]" />

        <span className="absolute right-[2px] top-[2px] h-[13px] w-[24px] rotate-[25deg] rounded-full bg-[#f080a3]" />
        <span className="absolute right-[-4px] top-[18px] h-[13px] w-[25px] rotate-[10deg] rounded-full bg-[#f48cab]" />
        <span className="absolute right-[-5px] top-[35px] h-[13px] w-[25px] -rotate-[4deg] rounded-full bg-[#f48cab]" />
        <span className="absolute right-[1px] top-[52px] h-[13px] w-[24px] -rotate-[24deg] rounded-full bg-[#f080a3]" />

        <span className="absolute right-[7px] top-[5px] h-[5px] w-[9px] rounded-full bg-white/35" />
        <span className="absolute right-[1px] top-[21px] h-[5px] w-[10px] rounded-full bg-white/30" />
      </div>

      {/* ROUND HEAD / BODY */}
      <div
        className="
          axolotl-body
          absolute
          left-1/2
          top-[43px]
          z-[3]
          h-[107px]
          w-[153px]
          -translate-x-1/2
          rounded-[51%_51%_46%_46%]
          border
          border-[#df88a4]
          bg-gradient-to-b
          from-[#ffd1de]
          via-[#f7aec3]
          to-[#eb91ae]
          shadow-[0_9px_20px_rgba(190,77,116,0.16)]
        "
      >
        {/* HEAD HIGHLIGHT */}
        <div
          className="
            absolute
            left-[27px]
            top-[10px]
            h-[14px]
            w-[52px]
            -rotate-12
            rounded-full
            bg-white/45
            blur-[0.2px]
          "
        />

        {/* TINY FOREHEAD HEART */}
        <div
          className="
            absolute
            left-1/2
            top-[17px]
            h-[8px]
            w-[8px]
            -translate-x-1/2
            rotate-45
            rounded-[2px]
            bg-[#ec779b]/45
          "
        >
          <span className="absolute -left-[4px] top-0 h-[8px] w-[8px] rounded-full bg-[#ec779b]/45" />
          <span className="absolute left-0 -top-[4px] h-[8px] w-[8px] rounded-full bg-[#ec779b]/45" />
        </div>

        {/* BIG SHINY LEFT EYE */}
        <div
          className="
            pet-eye-blink
            absolute
            left-[35px]
            top-[36px]
            h-[21px]
            w-[18px]
            rounded-[50%]
            bg-[#34252d]
            shadow-[0_2px_3px_rgba(0,0,0,0.15)]
          "
        >
          <span className="absolute left-[4px] top-[3px] h-[6px] w-[6px] rounded-full bg-white" />
          <span className="absolute right-[3px] bottom-[4px] h-[3px] w-[3px] rounded-full bg-white/70" />
        </div>

        {/* BIG SHINY RIGHT EYE */}
        <div
          className="
            pet-eye-blink
            absolute
            right-[35px]
            top-[36px]
            h-[21px]
            w-[18px]
            rounded-[50%]
            bg-[#34252d]
            shadow-[0_2px_3px_rgba(0,0,0,0.15)]
          "
        >
          <span className="absolute left-[4px] top-[3px] h-[6px] w-[6px] rounded-full bg-white" />
          <span className="absolute right-[3px] bottom-[4px] h-[3px] w-[3px] rounded-full bg-white/70" />
        </div>

        {/* EXTRA ROSY CHEEKS */}
        <div className="absolute left-[16px] top-[61px] h-[17px] w-[31px] rounded-full bg-[#ef6f9a]/30 blur-[0.2px]" />
        <div className="absolute right-[16px] top-[61px] h-[17px] w-[31px] rounded-full bg-[#ef6f9a]/30 blur-[0.2px]" />

        <span className="absolute left-[23px] top-[65px] h-[4px] w-[8px] -rotate-12 rounded-full bg-white/35" />
        <span className="absolute right-[23px] top-[65px] h-[4px] w-[8px] rotate-12 rounded-full bg-white/35" />

        {/* LITTLE :3-STYLE SMILE */}
        <div
          className="
            absolute
            left-1/2
            top-[61px]
            z-10
            -translate-x-1/2
          "
        >
          <span
            className="
              absolute
              right-[-1px]
              top-0
              h-[11px]
              w-[14px]
              rounded-full
              border-b-2
              border-[#a95672]
            "
          />

          <span
            className="
              absolute
              left-[-1px]
              top-0
              h-[11px]
              w-[14px]
              rounded-full
              border-b-2
              border-[#a95672]
            "
          />

          <span
            className="
              absolute
              left-1/2
              top-[9px]
              h-[5px]
              w-[7px]
              -translate-x-1/2
              rounded-b-full
              bg-[#dc6f91]/65
            "
          />
        </div>

        {/* PALE BELLY */}
        <div
          className="
            absolute
            left-1/2
            bottom-[3px]
            h-[30px]
            w-[78px]
            -translate-x-1/2
            rounded-[50%]
            bg-[#ffd4df]/55
          "
        />

        {/* TINY FRONT ARMS */}
        <div
          className="
            absolute
            left-[25px]
            bottom-[11px]
            h-[14px]
            w-[33px]
            rotate-[17deg]
            rounded-full
            bg-[#ec91ad]
          "
        />

        <div
          className="
            absolute
            right-[25px]
            bottom-[11px]
            h-[14px]
            w-[33px]
            -rotate-[17deg]
            rounded-full
            bg-[#ec91ad]
          "
        />
      </div>

      {/* FRONT FEET */}
      <div
        className="
          absolute
          left-[48px]
          bottom-[1px]
          z-[5]
          h-[18px]
          w-[36px]
          rotate-[5deg]
          rounded-[58%]
          border
          border-[#da819e]
          bg-gradient-to-b
          from-[#f7b0c4]
          to-[#ed96b0]
          shadow-sm
        "
      />

      <div
        className="
          absolute
          right-[48px]
          bottom-[1px]
          z-[5]
          h-[18px]
          w-[36px]
          -rotate-[5deg]
          rounded-[58%]
          border
          border-[#da819e]
          bg-gradient-to-b
          from-[#f7b0c4]
          to-[#ed96b0]
          shadow-sm
        "
      />
    </div>
  );
}


/* =========================================================
   PET SVG
========================================================= */

function PetAvatar({
  species,
  equipped = EMPTY_EQUIPPED,
  animation = 'idle',
  dialogue = null,
}: {
  species: PetSpecies;
  equipped?: EquippedItems;
  animation?: PetAnimation;
  dialogue?: string | null;
}) {
  return (
    <div
      className="
        relative
        w-[210px]
        h-[190px]
        flex
        items-center
        justify-center
        select-none
      "
    >

      {/* DIALOGUE BUBBLE */}
      {dialogue && (
        <div
          className="
            absolute
            left-1/2
            -top-[45px]
            z-50
            -translate-x-1/2
            w-max
            max-w-[190px]
            pet-dialogue
            pointer-events-none
          "
        >
          <div
            className="
              relative
              rounded-2xl
              border
              border-neutral-200
              dark:border-neutral-700
              bg-white
              dark:bg-neutral-800
              px-4
              py-2.5
              shadow-lg
              text-center
              text-[11px]
              leading-relaxed
              font-medium
              text-neutral-700
              dark:text-neutral-200
            "
          >
            {dialogue}

            {/* SPEECH TAIL */}
            <div
              className="
                absolute
                left-1/2
                bottom-[-6px]
                -translate-x-1/2
                w-[12px]
                h-[12px]
                rotate-45
                border-r
                border-b
                border-neutral-200
                dark:border-neutral-700
                bg-white
                dark:bg-neutral-800
              "
            />
          </div>
        </div>
      )}

      {/* PET */}
      <div
        className={`
          relative
          z-20
          will-change-transform
          pet-character
          pet-${species}
          pet-action-${animation}
        `}
      >

        {species ===
          'seal' && (
          <SealPet />
        )}

        {species ===
          'cat' && (
          <CatPet />
        )}

        {species ===
          'dog' && (
          <DogPet />
        )}

        {species ===
          'hamster' && (
          <HamsterPet />
        )}

        {species ===
          'frog' && (
          <FrogPet />
        )}

        {species ===
          'chick' && (
          <ChickPet />
        )}

        {species ===
          'axolotl' && (
          <AxolotlPet />
        )}

        <PetAccessories
          species={species}
          equipped={equipped}
        />
      </div>

      {/* CURRENT ACTION EFFECTS */}
      <PetActionEffects
        animation={animation}
      />

    </div>
  );
}

/* =========================================================
   PET PARK SCENE
========================================================= */

function PetParkScene({
  ownerId,
  pet,
  pets,
  selectedPetId,
  onSelect,
  sceneEvent,
  currentAnimation,
}: {
  ownerId: string;
  pet: PetData;
  pets: ParkPet[];
  selectedPetId: string | null;
  onSelect: (pet: ParkPet) => void;
  sceneEvent: ParkSceneEvent | null;
  currentAnimation: PetAnimation;
}) {
  const [parkClock, setParkClock] =
    useState(() => Date.now());

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setParkClock(
            Date.now()
          );
        },
        60 * 1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  const parkHour =
    Number(
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            'Asia/Manila',
          hour:
            '2-digit',
          hourCycle:
            'h23',
        }
      ).format(
        new Date(
          parkClock
        )
      )
    );

  const parkTime:
    | 'day'
    | 'sunset'
    | 'night' =
      parkHour >= 6 &&
      parkHour < 17
        ? 'day'
        : parkHour >= 17 &&
            parkHour < 19
          ? 'sunset'
          : 'night';

  const currentParkPet =
    useMemo<ParkPet>(
      () => ({
        ownerId,
        petName: pet.name,
        species: pet.species,
        personality:
          pet.personality,
        level: pet.level,
        equipped: {
          ...EMPTY_EQUIPPED,
          ...pet.equipped,
        },
        status: 'online',
      }),
      [
        ownerId,
        pet.name,
        pet.species,
        pet.personality,
        pet.level,
        pet.equipped,
      ]
    );

  const allPets =
    useMemo(
      () => [
        currentParkPet,
        ...pets,
      ],
      [
        currentParkPet,
        pets,
      ]
    );

  const petIdsKey =
    useMemo(
      () =>
        allPets
          .map(
            (parkPet) =>
              parkPet.ownerId
          )
          .join('|'),
      [allPets]
    );

  const [positions, setPositions] =
    useState<
      Record<
        string,
        ParkPosition
      >
    >({});

  useEffect(() => {
    setPositions(
      (previous) => {
        const next = {
          ...previous,
        };

        allPets.forEach(
          (
            parkPet,
            index
          ) => {
            if (
              next[
                parkPet.ownerId
              ]
            ) {
              return;
            }

            next[
              parkPet.ownerId
            ] = {
              x:
                12 +
                ((index * 19) %
                  76),
              y:
                46 +
                ((index * 13) %
                  34),
              flip:
                index % 2 ===
                0,
            };
          }
        );

        const activeIds =
          new Set(
            allPets.map(
              (parkPet) =>
                parkPet.ownerId
            )
          );

        Object.keys(
          next
        ).forEach(
          (id) => {
            if (
              !activeIds.has(id)
            ) {
              delete next[id];
            }
          }
        );

        return next;
      }
    );
  }, [petIdsKey]);

  const eventPartnerId =
    useMemo(() => {
      if (!sceneEvent) {
        return null;
      }

      if (
        sceneEvent.otherOwnerId
      ) {
        return sceneEvent.otherOwnerId;
      }

      return (
        pets.find(
          (parkPet) =>
            parkPet.petName ===
            sceneEvent.otherPetName
        )?.ownerId || null
      );
    }, [
      sceneEvent,
      pets,
    ]);

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          setPositions(
            (previous) => {
              const next = {
                ...previous,
              };

              allPets.forEach(
                (parkPet) => {
                  const isLocked =
                    sceneEvent &&
                    (
                      parkPet.ownerId ===
                        ownerId ||
                      parkPet.ownerId ===
                        eventPartnerId
                    );

                  if (isLocked) {
                    return;
                  }

                  const oldPosition =
                    previous[
                      parkPet.ownerId
                    ] || {
                      x: 50,
                      y: 64,
                      flip: false,
                    };

                  /*
                   * Slow, natural wandering:
                   * move a small distance instead
                   * of jumping across the park.
                   */
                  const nextX =
                    Math.min(
                      92,
                      Math.max(
                        8,
                        oldPosition.x +
                          (
                            Math.random() -
                            0.5
                          ) *
                            16
                      )
                    );

                  const nextY =
                    Math.min(
                      82,
                      Math.max(
                        44,
                        oldPosition.y +
                          (
                            Math.random() -
                            0.5
                          ) *
                            8
                      )
                    );

                  next[
                    parkPet.ownerId
                  ] = {
                    x: nextX,
                    y: nextY,
                    flip:
                      Math.abs(
                        nextX -
                          oldPosition.x
                      ) > 0.5
                        ? nextX <
                          oldPosition.x
                        : oldPosition.flip,
                  };
                }
              );

              return next;
            }
          );
        },
        12000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [
    petIdsKey,
    sceneEvent?.id,
    ownerId,
    eventPartnerId,
  ]);

  const getScenePosition =
    (
      parkPet: ParkPet
    ): ParkPosition => {
      const normal =
        positions[
          parkPet.ownerId
        ] || {
          x: 50,
          y: 66,
          flip: false,
        };

      if (
        !sceneEvent ||
        !eventPartnerId
      ) {
        return normal;
      }

      const isMe =
        parkPet.ownerId ===
        ownerId;

      const isPartner =
        parkPet.ownerId ===
        eventPartnerId;

      if (
        !isMe &&
        !isPartner
      ) {
        return normal;
      }

      if (
        sceneEvent.type ===
        'wave'
      ) {
        return isMe
          ? {
              x: 43,
              y: 58,
              flip: false,
            }
          : {
              x: 57,
              y: 58,
              flip: true,
            };
      }

      if (
        sceneEvent.type ===
        'play'
      ) {
        return isMe
          ? {
              x: 42,
              y: 69,
              flip: false,
            }
          : {
              x: 61,
              y: 69,
              flip: true,
            };
      }

      if (
        sceneEvent.type ===
        'sit'
      ) {
        return isMe
          ? {
              x: 57,
              y: 38,
              flip: false,
            }
          : {
              x: 68,
              y: 38,
              flip: true,
            };
      }

      return isMe
        ? {
            x: 68,
            y: 72,
            flip: false,
          }
        : {
            x: 80,
            y: 72,
            flip: true,
          };
    };

  const getSceneMessage = () => {
    if (!sceneEvent) {
      return null;
    }

    if (
      sceneEvent.type ===
      'wave'
    ) {
      return sceneEvent.direction ===
        'outgoing'
        ? `${pet.name} waved at ${sceneEvent.otherPetName}.`
        : `${sceneEvent.otherPetName} waved at ${pet.name}.`;
    }

    if (
      sceneEvent.type ===
      'play'
    ) {
      return sceneEvent.direction ===
        'outgoing'
        ? `${pet.name} and ${sceneEvent.otherPetName} are playing together.`
        : `${sceneEvent.otherPetName} came over to play with ${pet.name}.`;
    }

    if (
      sceneEvent.type ===
      'sit'
    ) {
      return `${pet.name} and ${sceneEvent.otherPetName} are hanging out by the bench.`;
    }

    return sceneEvent.direction ===
      'outgoing'
      ? `${pet.name} brought ${sceneEvent.foodName || 'a treat'} to ${sceneEvent.otherPetName}.`
      : `${sceneEvent.otherPetName} brought ${pet.name} ${sceneEvent.foodName || 'a treat'}.`;
  };

  return (
    <div
      className="
        relative
        h-full
        min-h-0
        overflow-hidden
        touch-manipulation
      "
    >
      {/* TIME-MATCHED SKY — Philippine time */}
      <div
        className={`absolute inset-0 transition-colors duration-1000 ${
          parkTime === 'day'
            ? 'bg-sky-100'
            : parkTime === 'sunset'
              ? 'bg-orange-100'
              : 'bg-slate-950'
        }`}
      />

      <div
        className={`absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b transition-all duration-1000 ${
          parkTime === 'day'
            ? 'from-sky-200 via-sky-100 to-sky-50'
            : parkTime === 'sunset'
              ? 'from-violet-400 via-orange-300 to-amber-100'
              : 'from-slate-950 via-indigo-950 to-slate-900'
        }`}
      />

      {/* SUN / MOON */}
      {parkTime === 'night' ? (
        <>
          <div
            className="
              absolute
              right-[8%]
              top-[6%]
              h-12
              w-12
              rounded-full
              bg-slate-100
              shadow-[0_0_34px_rgba(226,232,240,0.5)]
            "
          >
            <span className="absolute left-[9px] top-[10px] h-2.5 w-2.5 rounded-full bg-slate-300/55" />
            <span className="absolute bottom-[9px] right-[8px] h-3 w-3 rounded-full bg-slate-300/45" />
          </div>

          {/* STARS */}
          <div className="absolute inset-x-0 top-0 h-[31%] opacity-80 pointer-events-none">
            {[
              [8, 18],
              [17, 9],
              [27, 22],
              [39, 8],
              [50, 18],
              [61, 7],
              [70, 22],
              [80, 13],
              [91, 25],
              [33, 29],
              [57, 27],
            ].map(
              ([left, top], index) => (
                <span
                  key={index}
                  className="absolute h-1 w-1 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                  }}
                />
              )
            )}
          </div>
        </>
      ) : (
        <div
          className={`absolute right-[8%] top-[6%] h-14 w-14 rounded-full transition-all duration-1000 ${
            parkTime === 'sunset'
              ? 'bg-orange-300 shadow-[0_0_45px_rgba(251,146,60,0.7)]'
              : 'bg-amber-200 shadow-[0_0_40px_rgba(253,230,138,0.7)]'
          }`}
        />
      )}

      {/* CLOUDS */}
      <div className={`absolute left-[9%] top-[8%] h-8 w-24 rounded-full ${
        parkTime === 'night'
          ? 'bg-slate-300/10'
          : parkTime === 'sunset'
            ? 'bg-rose-50/45'
            : 'bg-white/80'
      }`}>
        <span className="absolute -top-4 left-5 h-10 w-10 rounded-full bg-white/90 dark:bg-white/10" />
        <span className="absolute -top-2 right-4 h-8 w-8 rounded-full bg-white/90 dark:bg-white/10" />
      </div>

      <div className={`absolute left-[43%] top-[13%] h-6 w-20 rounded-full ${
        parkTime === 'night'
          ? 'bg-slate-300/10'
          : parkTime === 'sunset'
            ? 'bg-rose-50/40'
            : 'bg-white/70'
      }`}>
        <span className="absolute -top-3 left-4 h-7 w-7 rounded-full bg-white/80 dark:bg-white/10" />
      </div>

      {/* DISTANT HILLS */}
      <div className={`absolute -left-[8%] top-[24%] h-36 w-[58%] rounded-[50%] ${
        parkTime === 'night'
          ? 'bg-emerald-950/90'
          : parkTime === 'sunset'
            ? 'bg-emerald-500/70'
            : 'bg-emerald-200'
      }`} />
      <div className={`absolute right-[-12%] top-[22%] h-40 w-[66%] rounded-[50%] ${
        parkTime === 'night'
          ? 'bg-emerald-900/80'
          : parkTime === 'sunset'
            ? 'bg-emerald-600/65'
            : 'bg-emerald-300/80'
      }`} />

      {/* GRASS */}
      <div
        className={`absolute inset-x-0 bottom-0 top-[31%] bg-gradient-to-b transition-all duration-1000 ${
          parkTime === 'night'
            ? 'from-emerald-950 via-emerald-950 to-slate-950'
            : parkTime === 'sunset'
              ? 'from-emerald-500 via-emerald-600 to-emerald-700'
              : 'from-emerald-300 via-emerald-300 to-emerald-400'
        }`}
      />

      {/* FENCE */}
      <div className="absolute inset-x-0 top-[34%] z-[2] h-11 opacity-65">
        <div className="absolute left-0 right-0 top-4 h-1.5 bg-amber-800/40 dark:bg-amber-700/30" />
        <div className="absolute left-0 right-0 top-8 h-1.5 bg-amber-800/40 dark:bg-amber-700/30" />
        {Array.from({
          length: 18,
        }).map((_, index) => (
          <span
            key={index}
            className="absolute top-0 h-11 w-2 rounded-t-md bg-amber-800/45 dark:bg-amber-700/35"
            style={{
              left: `${index * 6}%`,
            }}
          />
        ))}
      </div>

      {/* WALKING PATH */}
      <div
        className="absolute -bottom-[22%] left-[31%] z-[3] h-[85%] w-[42%] rotate-[6deg] rounded-[48%] bg-amber-100/80 shadow-inner dark:bg-stone-700/60"
        style={{
          clipPath:
            'polygon(40% 0%, 63% 0%, 86% 100%, 4% 100%)',
        }}
      />

      {/* POND */}
      <div className="absolute bottom-[7%] left-[4%] z-[4] h-[18%] w-[27%] rounded-[50%] border-4 border-emerald-500/30 bg-sky-300/80 shadow-inner dark:border-emerald-900 dark:bg-sky-900/70">
        <div className="absolute left-[18%] top-[25%] h-2 w-[30%] rounded-full bg-white/35" />
        <div className="absolute bottom-[20%] right-[20%] h-2 w-[22%] rounded-full bg-white/25" />
      </div>

      {/* TREE LEFT */}
      <div className="absolute left-[3%] top-[25%] z-[5] h-44 w-32 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 h-24 w-7 -translate-x-1/2 rounded-t-xl bg-amber-900/70 dark:bg-amber-950" />
        <div className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full bg-emerald-600 shadow-lg dark:bg-emerald-800" />
        <div className="absolute left-2 top-10 h-16 w-16 rounded-full bg-emerald-500 dark:bg-emerald-700" />
        <div className="absolute right-1 top-7 h-16 w-16 rounded-full bg-emerald-500 dark:bg-emerald-700" />
      </div>

      {/* TREE RIGHT */}
      <div className="absolute right-[2%] top-[29%] z-[5] h-36 w-28 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 h-20 w-6 -translate-x-1/2 rounded-t-xl bg-amber-900/65 dark:bg-amber-950" />
        <div className="absolute left-1/2 top-0 h-20 w-20 -translate-x-1/2 rounded-full bg-emerald-600 dark:bg-emerald-800" />
        <div className="absolute left-1 top-9 h-14 w-14 rounded-full bg-emerald-500 dark:bg-emerald-700" />
      </div>

      {/* BENCH */}
      <div className="absolute right-[25%] top-[31%] z-[8] h-24 w-40 pointer-events-none">
        <div className="absolute left-3 right-3 top-3 h-6 rounded-md border border-amber-900/30 bg-amber-700/80 dark:bg-amber-800" />
        <div className="absolute left-0 right-0 top-11 h-5 rounded-md border border-amber-900/30 bg-amber-700/90 dark:bg-amber-800" />
        <div className="absolute bottom-0 left-7 h-10 w-3 rotate-6 bg-neutral-700 dark:bg-neutral-500" />
        <div className="absolute bottom-0 right-7 h-10 w-3 -rotate-6 bg-neutral-700 dark:bg-neutral-500" />
      </div>

      {/* FLOWERS */}
      <div className="absolute bottom-[22%] left-[35%] z-[5] flex gap-3 opacity-80 pointer-events-none">
        <span className="h-2.5 w-2.5 rounded-full bg-pink-400" />
        <span className="h-2 w-2 rounded-full bg-yellow-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
        <span className="h-2 w-2 rounded-full bg-pink-300" />
      </div>

      {/* PARK SIGN */}
      <div className="absolute left-1/2 top-[4%] z-10 -translate-x-1/2 rounded-2xl border border-emerald-900/10 bg-white/75 px-4 py-2 text-center shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/70">
        <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">
          Tambayan Pet Park
        </p>
        <p className="mt-0.5 text-[9px] font-medium text-neutral-500 dark:text-neutral-400">
          pets wander around while you hang out
        </p>
        <p className="mt-1 font-mono text-[6px] font-black uppercase tracking-wider text-neutral-400">
          {parkTime === 'day'
            ? 'Daytime'
            : parkTime === 'sunset'
              ? 'Sunset'
              : 'Nighttime'} · PH time
        </p>
      </div>

      {/* ACTIVE INTERACTION CAPTION */}
      {sceneEvent && (
        <div className="absolute left-1/2 top-[17%] z-[70] w-[min(88%,420px)] -translate-x-1/2 rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-center shadow-lg backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/90">
          <p className="text-xs font-bold leading-relaxed">
            {getSceneMessage()}
          </p>
        </div>
      )}

      {/* PLAY BALL */}
      {sceneEvent?.type ===
        'play' &&
        eventPartnerId && (
          <div className="absolute left-[51%] top-[66%] z-[65] h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-bounce rounded-full border-2 border-white bg-amber-400 shadow-md" />
        )}

      {/* TREAT BOWL */}
      {sceneEvent?.type ===
        'treat' &&
        eventPartnerId && (
          <div className="absolute left-[74%] top-[72%] z-[65] -translate-x-1/2 -translate-y-1/2">
            <div className="h-4 w-9 rounded-b-full border border-rose-700/30 bg-rose-400 shadow-md" />
            <div className="absolute -top-1 left-1/2 h-2 w-7 -translate-x-1/2 rounded-full bg-amber-200" />
          </div>
        )}

      {/* PETS */}
      {allPets.map(
        (parkPet) => {
          const position =
            getScenePosition(
              parkPet
            );

          const isMe =
            parkPet.ownerId ===
            ownerId;

          const isPartner =
            Boolean(
              sceneEvent &&
                eventPartnerId &&
                parkPet.ownerId ===
                  eventPartnerId
            );

          const isEventPair =
            Boolean(
              sceneEvent &&
                (
                  isMe ||
                  isPartner
                )
            );

          const treatReceiverId =
            sceneEvent?.type ===
            'treat'
              ? sceneEvent.direction ===
                'outgoing'
                ? eventPartnerId
                : ownerId
              : null;

          let avatarAnimation:
            PetAnimation =
              isMe
                ? currentAnimation
                : 'idle';

          if (
            isEventPair &&
            sceneEvent?.type ===
              'play'
          ) {
            avatarAnimation =
              'play';
          }

          if (
            parkPet.ownerId ===
              treatReceiverId
          ) {
            avatarAnimation =
              'feed';
          }

          /*
           * Keep pets intentionally small in the park.
           * This prevents the scene from becoming visually
           * chaotic when many users are online.
           */
          const depthScale =
            Math.min(
              0.42,
              Math.max(
                0.30,
                0.27 +
                  position.y *
                    0.0018
              )
            );

          return (
            <button
              key={
                parkPet.ownerId
              }
              type="button"
              disabled={isMe}
              onClick={() => {
                if (!isMe) {
                  onSelect(
                    parkPet
                  );
                }
              }}
              className={`
                absolute
                z-20
                h-[92px]
                w-[82px]
                -translate-x-1/2
                -translate-y-1/2
                transition-[left,top]
                ease-in-out
                disabled:cursor-default
                sm:h-[102px]
                sm:w-[90px]
                ${
                  isEventPair
                    ? 'duration-[2200ms]'
                    : 'duration-[11000ms]'
                }
              `}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                zIndex:
                  20 +
                  Math.round(
                    position.y
                  ),
              }}
              aria-label={
                isMe
                  ? `${parkPet.petName}, your pet`
                  : `Interact with ${parkPet.petName}`
              }
            >
              {/* WAVE BUBBLE */}
              {isEventPair &&
                sceneEvent?.type ===
                  'wave' && (
                  <div className="absolute left-1/2 top-0 z-[90] -translate-x-1/2 animate-bounce rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[9px] font-black shadow-md dark:border-neutral-700 dark:bg-neutral-900">
                    hi!
                  </div>
                )}

              <div
                className={`
                  absolute
                  left-1/2
                  top-[44%]
                  h-[190px]
                  w-[210px]
                  origin-center
                  -translate-x-1/2
                  -translate-y-1/2
                  transition-transform
                  duration-500
                  ${
                    isPartner &&
                    sceneEvent?.type ===
                      'wave'
                      ? 'animate-pulse'
                      : ''
                  }
                `}
                style={{
                  transform: `translate(-50%, -50%) scale(${depthScale}) scaleX(${position.flip ? -1 : 1})`,
                }}
              >
                <PetAvatar
                  species={
                    parkPet.species
                  }
                  equipped={
                    parkPet.equipped
                  }
                  animation={
                    avatarAnimation
                  }
                />
              </div>

              <div
                className={`
                  absolute
                  bottom-0
                  left-1/2
                  max-w-[88px]
                  -translate-x-1/2
                  whitespace-nowrap
                  rounded-full
                  border
                  px-2.5
                  py-1
                  shadow-sm
                  backdrop-blur
                  ${
                    selectedPetId ===
                    parkPet.ownerId
                      ? 'border-emerald-500 bg-emerald-600 text-white'
                      : isMe
                        ? 'border-emerald-300 bg-white/90 text-emerald-700 dark:border-emerald-800 dark:bg-neutral-900/90 dark:text-emerald-300'
                        : 'border-white/70 bg-white/85 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/85 dark:text-neutral-200'
                  }
                `}
              >
                <p className="truncate text-[9px] font-black leading-none">
                  {parkPet.petName}
                </p>

                <p className="mt-1 font-mono text-[6px] uppercase tracking-wider opacity-70">
                  {isMe
                    ? 'You'
                    : `Lv. ${parkPet.level}`}
                </p>
              </div>
            </button>
          );
        }
      )}

      {pets.length === 0 && (
        <div className="absolute bottom-5 left-1/2 z-[100] w-[min(88%,380px)] -translate-x-1/2 rounded-2xl border border-white/60 bg-white/75 px-4 py-3 text-center shadow-lg backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/80">
          <p className="text-sm font-bold">
            Quiet day at the park.
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
            Your pet can still wander around. Other pets will appear here when their owners enter the park.
          </p>
        </div>
      )}
    </div>
  );
}

function PetActionEffects({
  animation,
}: {
  animation: PetAnimation;
}) {
  return (
    <div className="absolute inset-0 z-30 pointer-events-none">

      {/* FEED */}
      {animation === 'feed' && (
        <>
          {/* BOWL */}
          <div className="absolute left-1/2 bottom-[10px] -translate-x-1/2 w-[74px] h-[34px]">
            <div className="absolute bottom-0 inset-x-0 h-[18px] rounded-b-[18px] rounded-t-[8px] border border-[#b96b3f] bg-gradient-to-b from-[#e79b62] to-[#cc7442]" />
            <div className="absolute left-[8px] right-[8px] top-[7px] h-[10px] rounded-full bg-[#7b5137]" />
          </div>

          {/* FOOD BITS */}
          <span className="absolute left-[88px] bottom-[58px] w-[8px] h-[8px] rounded-full bg-[#b07a52] pet-feed-bit-1" />
          <span className="absolute left-[104px] bottom-[64px] w-[7px] h-[7px] rounded-full bg-[#c38a59] pet-feed-bit-2" />
          <span className="absolute left-[121px] bottom-[58px] w-[8px] h-[8px] rounded-full bg-[#a86d47] pet-feed-bit-3" />
        </>
      )}

      {/* PLAY */}
      {animation === 'play' && (
        <>
          {/* BALL */}
          <div className="absolute right-[18px] bottom-[18px] w-[34px] h-[34px] rounded-full border-2 border-emerald-700 bg-emerald-400 pet-play-ball">
            <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[2px] bg-emerald-700/70" />
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[2px] bg-emerald-700/70" />
          </div>

          {/* SPARK LINES */}
          <span className="absolute right-[55px] bottom-[62px] w-[12px] h-[2px] rounded-full bg-emerald-400 pet-play-spark-1" />
          <span className="absolute right-[22px] bottom-[77px] w-[10px] h-[2px] rounded-full bg-emerald-400 rotate-45 pet-play-spark-2" />
          <span className="absolute right-[67px] bottom-[30px] w-[10px] h-[2px] rounded-full bg-emerald-400 -rotate-45 pet-play-spark-3" />
        </>
      )}

      {/* STUDY */}
      {animation === 'study' && (
        <>
          {/* OPEN BOOK */}
          <div className="absolute left-1/2 bottom-[10px] -translate-x-1/2 w-[96px] h-[52px] pet-study-book">
            <div className="absolute left-0 top-0 w-[46px] h-[46px] rounded-l-[14px] rounded-r-[6px] border border-[#d5d7db] bg-white shadow-sm" />
            <div className="absolute right-0 top-0 w-[46px] h-[46px] rounded-r-[14px] rounded-l-[6px] border border-[#d5d7db] bg-white shadow-sm" />
            <div className="absolute left-1/2 top-[3px] bottom-[6px] -translate-x-1/2 w-[3px] rounded-full bg-neutral-300" />

            <div className="absolute left-[9px] top-[11px] w-[24px] h-[2px] bg-neutral-300 rounded-full" />
            <div className="absolute left-[9px] top-[18px] w-[19px] h-[2px] bg-neutral-200 rounded-full" />

            <div className="absolute right-[9px] top-[11px] w-[24px] h-[2px] bg-neutral-300 rounded-full" />
            <div className="absolute right-[9px] top-[18px] w-[19px] h-[2px] bg-neutral-200 rounded-full" />
          </div>

          {/* FOCUS LINES */}
          <span className="absolute left-[78px] top-[22px] w-[4px] h-[16px] rounded-full bg-emerald-400 pet-study-line-1" />
          <span className="absolute left-[102px] top-[14px] w-[4px] h-[22px] rounded-full bg-emerald-500 pet-study-line-2" />
          <span className="absolute left-[126px] top-[22px] w-[4px] h-[16px] rounded-full bg-emerald-400 pet-study-line-3" />
        </>
      )}

      {/* SLEEP */}
      {animation === 'sleep' && (
        <>
          {/* PILLOW */}
          <div className="absolute left-1/2 bottom-[14px] -translate-x-1/2 w-[110px] h-[28px] rounded-full border border-neutral-200 bg-white/90 shadow-sm" />

          {/* ZZZ */}
          <div className="absolute right-[34px] top-[18px] text-neutral-500 font-black">
            <span className="absolute text-[12px] pet-sleep-z-1">
              z
            </span>
            <span className="absolute left-[16px] top-[-14px] text-[16px] pet-sleep-z-2">
              z
            </span>
            <span className="absolute left-[36px] top-[-30px] text-[20px] pet-sleep-z-3">
              z
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function PetAccessories({
  species,
  equipped,
}: {
  species: PetSpecies;
  equipped: EquippedItems;
}) {
  return (
    <div className="absolute inset-0 z-30 pointer-events-none">

      {/* HEAD */}

      {equipped.head ===
        'black_headphones' && (
        <div className="absolute left-1/2 top-[19px] -translate-x-1/2 w-[157px] h-[105px]">

          {/* BAND */}
          <div
            className="
              absolute
              left-1/2
              top-0
              -translate-x-1/2
              w-[126px]
              h-[86px]
              rounded-t-[60px]
              border-[8px]
              border-b-0
              border-neutral-800
            "
          />

          {/* LEFT EAR CUP */}
          <div
            className="
              absolute
              left-[4px]
              top-[58px]
              w-[27px]
              h-[47px]
              rounded-xl
              border
              border-neutral-950
              bg-neutral-800
              shadow
            "
          />

          {/* RIGHT EAR CUP */}
          <div
            className="
              absolute
              right-[4px]
              top-[58px]
              w-[27px]
              h-[47px]
              rounded-xl
              border
              border-neutral-950
              bg-neutral-800
              shadow
            "
          />

        </div>
      )}

      {equipped.head ===
        'tambay_cap' && (
        <div
          className="
            absolute
            left-1/2
            top-[5px]
            -translate-x-1/2
            w-[112px]
            h-[57px]
          "
        >

          <div
            className="
              absolute
              left-[7px]
              top-[5px]
              w-[96px]
              h-[49px]
              rounded-t-[55%]
              rounded-b-[25%]
              border
              border-[#126e51]
              bg-emerald-600
              shadow-sm
            "
          />

          <div
            className="
              absolute
              left-[44px]
              bottom-[-2px]
              w-[80px]
              h-[14px]
              rotate-[5deg]
              rounded-full
              border
              border-[#126e51]
              bg-emerald-700
            "
          />

        </div>
      )}

      {equipped.head ===
        'pink_ribbon' && (
        <div className="absolute right-[25px] top-[28px] w-[57px] h-[43px] rotate-[15deg]">

          <div
            className="
              absolute
              left-0
              top-[4px]
              w-[27px]
              h-[29px]
              rotate-[-18deg]
              rounded-[70%_45%_60%_45%]
              border
              border-[#db79a3]
              bg-[#F79ac0]
            "
          />

          <div
            className="
              absolute
              right-0
              top-[4px]
              w-[27px]
              h-[29px]
              rotate-[18deg]
              rounded-[45%_70%_45%_60%]
              border
              border-[#db79a3]
              bg-[#F79ac0]
            "
          />

          <div
            className="
              absolute
              left-1/2
              top-[10px]
              z-10
              -translate-x-1/2
              w-[20px]
              h-[20px]
              rounded-full
              border
              border-[#cf6d97]
              bg-[#ed8eb6]
            "
          />

        </div>
      )}

      {equipped.head ===
        'graduation_cap' && (
        <div
          className="
            absolute
            left-1/2
            top-[-2px]
            -translate-x-1/2
            w-[125px]
            h-[73px]
          "
        >

          {/* CAP */}
          <div
            className="
              absolute
              left-1/2
              top-[15px]
              -translate-x-1/2
              rotate-[-5deg]
              w-[105px]
              h-[54px]
              bg-neutral-900
              [clip-path:polygon(50%_0%,100%_40%,50%_80%,0%_40%)]
              drop-shadow
            "
          />

          {/* BASE */}
          <div
            className="
              absolute
              left-1/2
              top-[46px]
              -translate-x-1/2
              w-[66px]
              h-[24px]
              rounded-b-xl
              bg-neutral-900
            "
          />

          {/* BUTTON */}
          <div
            className="
              absolute
              left-1/2
              top-[31px]
              z-10
              -translate-x-1/2
              w-[8px]
              h-[8px]
              rounded-full
              bg-neutral-600
            "
          />

          {/* TASSEL */}
          <div
            className="
              absolute
              right-[24px]
              top-[33px]
              w-px
              h-[38px]
              bg-amber-500
            "
          />

          <div
            className="
              absolute
              right-[20px]
              top-[67px]
              w-[9px]
              h-[13px]
              rounded-b-full
              bg-amber-500
            "
          />

        </div>
      )}

      {/* FACE */}

      {equipped.face ===
        'round_glasses' && (
        <div
          className="
            absolute
            left-1/2
            top-[70px]
            -translate-x-1/2
            w-[104px]
            h-[37px]
          "
        >

          <div
            className="
              absolute
              left-0
              top-0
              w-[39px]
              h-[34px]
              rounded-full
              border-[3px]
              border-neutral-800
              bg-white/5
            "
          />

          <div
            className="
              absolute
              right-0
              top-0
              w-[39px]
              h-[34px]
              rounded-full
              border-[3px]
              border-neutral-800
              bg-white/5
            "
          />

          <div
            className="
              absolute
              left-1/2
              top-[12px]
              -translate-x-1/2
              w-[27px]
              h-[3px]
              bg-neutral-800
            "
          />

        </div>
      )}

      {/* NECK */}

      {equipped.neck === 'scarf' && (
        <ScarfAccessory
          species={species}
        />
      )}

      {/* PROP */}

      {equipped.prop ===
        'study_book' && (
        <div
          className="
            absolute
            right-[8px]
            bottom-[14px]
            w-[66px]
            h-[51px]
            rotate-[-9deg]
          "
        >

          <div
            className="
              absolute
              inset-0
              rounded-md
              border-2
              border-[#285f54]
              bg-emerald-700
              shadow-md
            "
          />

          <div
            className="
              absolute
              left-[8px]
              top-[5px]
              bottom-[5px]
              w-[3px]
              rounded-full
              bg-emerald-900/50
            "
          />

          <div
            className="
              absolute
              left-[20px]
              right-[9px]
              top-[14px]
              h-[3px]
              rounded-full
              bg-white/60
            "
          />

          <div
            className="
              absolute
              left-[20px]
              right-[16px]
              top-[23px]
              h-[3px]
              rounded-full
              bg-white/40
            "
          />

        </div>
      )}

      {equipped.prop ===
        'coffee_cup' && (
        <div
          className="
            absolute
            right-[10px]
            bottom-[13px]
            w-[59px]
            h-[65px]
          "
        >

          {/* STEAM */}
          <div
            className="
              absolute
              left-[18px]
              top-0
              w-[8px]
              h-[19px]
              rounded-full
              border-l-2
              border-neutral-400
              rotate-[12deg]
            "
          />

          <div
            className="
              absolute
              left-[31px]
              top-[2px]
              w-[8px]
              h-[17px]
              rounded-full
              border-l-2
              border-neutral-400
              -rotate-[12deg]
            "
          />

          {/* CUP */}
          <div
            className="
              absolute
              left-[5px]
              bottom-0
              w-[43px]
              h-[39px]
              rounded-b-xl
              rounded-t-md
              border
              border-neutral-300
              bg-white
              shadow
            "
          />

          {/* HANDLE */}
          <div
            className="
              absolute
              right-[1px]
              bottom-[9px]
              w-[20px]
              h-[23px]
              rounded-full
              border-[4px]
              border-white
            "
          />

          {/* COFFEE */}
          <div
            className="
              absolute
              left-[8px]
              bottom-[34px]
              w-[37px]
              h-[7px]
              rounded-full
              bg-[#624231]
            "
          />

        </div>
      )}


      {equipped.prop === 'matcha_cup' && (
        <div
          className="
            absolute
            right-[8px]
            bottom-[10px]
            w-[62px]
            h-[72px]
          "
        >
          {/* STRAW */}
          <div
            className="
              absolute
              left-[36px]
              top-[1px]
              z-0
              w-[4px]
              h-[32px]
              rotate-[8deg]
              rounded-full
              bg-[#d9c7a3]
              border border-[#bca984]
            "
          />

          {/* CUP */}
          <div
            className="
              absolute
              left-[7px]
              bottom-0
              z-10
              w-[45px]
              h-[48px]
              overflow-hidden
              rounded-b-[12px]
              rounded-t-[7px]
              border-2
              border-white/80
              bg-white/25
              shadow-md
            "
          >
            {/* MATCHA LATTE */}
            <div
              className="
                absolute
                inset-x-[2px]
                bottom-[2px]
                h-[38px]
                rounded-b-[9px]
                bg-gradient-to-b
                from-[#a8c97f]
                via-[#8fb466]
                to-[#789c50]
              "
            />

            {/* CREAMY TOP */}
            <div
              className="
                absolute
                left-[2px]
                right-[2px]
                top-[5px]
                h-[9px]
                rounded-full
                bg-[#dce8c8]
              "
            />

            {/* MATCHA FOAM */}
            <div
              className="
                absolute
                left-[6px]
                right-[6px]
                top-[8px]
                h-[4px]
                rounded-full
                bg-[#789d55]
              "
            />

            {/* GLASS HIGHLIGHT */}
            <div
              className="
                absolute
                left-[5px]
                top-[13px]
                w-[4px]
                h-[24px]
                rounded-full
                bg-white/35
              "
            />
          </div>

          {/* CUP RIM */}
          <div
            className="
              absolute
              left-[6px]
              bottom-[43px]
              z-20
              w-[47px]
              h-[8px]
              rounded-full
              border-2
              border-white/80
              bg-[#b8d493]
              shadow-sm
            "
          />

          {/* MATCHA LEAF */}
          <div
            className="
              absolute
              left-[25px]
              bottom-[19px]
              z-20
              w-[12px]
              h-[7px]
              -rotate-[25deg]
              rounded-[100%_0_100%_0]
              bg-[#4f7f3b]
            "
          />
        </div>
      )}

    </div>
  );
}

function ScarfAccessory({
  species,
}: {
  species: PetSpecies;
}) {
  const layouts: Record<
    PetSpecies,
    {
      top: string;
      width: string;
      collarWidth: string;
      tailRight: string;
      tailTop: string;
      scale: string;
    }
  > = {
    seal: {
      top: 'top-[126px]',
      width: 'w-[126px]',
      collarWidth: 'w-[122px]',
      tailRight: 'right-[24px]',
      tailTop: 'top-[17px]',
      scale: 'scale-100',
    },

    cat: {
      top: 'top-[128px]',
      width: 'w-[120px]',
      collarWidth: 'w-[116px]',
      tailRight: 'right-[23px]',
      tailTop: 'top-[17px]',
      scale: 'scale-100',
    },

    dog: {
      top: 'top-[129px]',
      width: 'w-[122px]',
      collarWidth: 'w-[118px]',
      tailRight: 'right-[23px]',
      tailTop: 'top-[17px]',
      scale: 'scale-100',
    },

    hamster: {
      top: 'top-[133px]',
      width: 'w-[106px]',
      collarWidth: 'w-[102px]',
      tailRight: 'right-[20px]',
      tailTop: 'top-[16px]',
      scale: 'scale-[0.92]',
    },

    frog: {
      top: 'top-[119px]',
      width: 'w-[125px]',
      collarWidth: 'w-[121px]',
      tailRight: 'right-[24px]',
      tailTop: 'top-[17px]',
      scale: 'scale-100',
    },

    chick: {
      top: 'top-[126px]',
      width: 'w-[105px]',
      collarWidth: 'w-[101px]',
      tailRight: 'right-[19px]',
      tailTop: 'top-[16px]',
      scale: 'scale-[0.92]',
    },

    axolotl: {
      top: 'top-[126px]',
      width: 'w-[116px]',
      collarWidth: 'w-[112px]',
      tailRight: 'right-[21px]',
      tailTop: 'top-[17px]',
      scale: 'scale-[0.96]',
    },
  };

  const layout =
    layouts[species];

  return (
    <div
      className={`
        absolute
        left-1/2
        ${layout.top}
        -translate-x-1/2
        ${layout.width}
        h-[60px]
        ${layout.scale}
        origin-top
        pointer-events-none
      `}
    >

      {/* COLLAR */}
      <div
        className={`
          absolute
          left-1/2
          top-0
          -translate-x-1/2
          ${layout.collarWidth}
          h-[25px]
          rounded-[50%]
          border
          border-[#9f4545]
          bg-gradient-to-b
          from-[#d66a6a]
          to-[#bf5050]
          shadow-sm
        `}
      >

        {/* SCARF HIGHLIGHT */}
        <div
          className="
            absolute
            left-[14px]
            right-[14px]
            top-[4px]
            h-[5px]
            rounded-full
            bg-white/15
          "
        />

      </div>

      {/* KNOT */}
      <div
        className="
          absolute
          right-[34px]
          top-[15px]
          z-10
          w-[20px]
          h-[19px]
          rotate-[7deg]
          rounded-[45%]
          border
          border-[#973f3f]
          bg-[#c85858]
          shadow-sm
        "
      />

      {/* HANGING END */}
      <div
        className={`
          absolute
          ${layout.tailRight}
          ${layout.tailTop}
          w-[26px]
          h-[43px]
          rotate-[11deg]
          rounded-b-[9px]
          border
          border-[#9f4545]
          bg-gradient-to-b
          from-[#c95b5b]
          to-[#b84848]
          shadow-sm
        `}
      >

        {/* SMALL END DETAIL */}
        <div
          className="
            absolute
            left-[4px]
            right-[4px]
            bottom-[7px]
            h-px
            bg-white/20
          "
        />

      </div>

    </div>
  );
}

function AccessoryPreview({
  itemId,
}: {
  itemId: string;
}) {
  return (
    <div
      className="
        relative
        h-[95px]
        rounded-xl
        border
        border-neutral-200
        dark:border-neutral-800
        bg-white
        dark:bg-neutral-900
        overflow-hidden
        flex
        items-center
        justify-center
      "
    >

      {itemId ===
        'round_glasses' && (
        <div className="relative w-[76px] h-[30px]">

          <div className="absolute left-0 w-[30px] h-[28px] rounded-full border-[3px] border-neutral-800 dark:border-neutral-300" />

          <div className="absolute right-0 w-[30px] h-[28px] rounded-full border-[3px] border-neutral-800 dark:border-neutral-300" />

          <div className="absolute left-1/2 top-[11px] -translate-x-1/2 w-[19px] h-[3px] bg-neutral-800 dark:bg-neutral-300" />

        </div>
      )}

      {itemId ===
        'black_headphones' && (
        <div className="relative w-[75px] h-[65px]">

          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[60px] h-[53px] rounded-t-[30px] border-[6px] border-b-0 border-neutral-800" />

          <div className="absolute left-0 bottom-0 w-[18px] h-[32px] rounded-lg bg-neutral-800" />

          <div className="absolute right-0 bottom-0 w-[18px] h-[32px] rounded-lg bg-neutral-800" />

        </div>
      )}

      {itemId ===
        'pink_ribbon' && (
        <div className="relative w-[64px] h-[45px]">

          <div className="absolute left-[3px] top-[7px] w-[30px] h-[31px] -rotate-[18deg] rounded-[70%_45%_60%_45%] bg-[#F79ac0]" />

          <div className="absolute right-[3px] top-[7px] w-[30px] h-[31px] rotate-[18deg] rounded-[45%_70%_45%_60%] bg-[#F79ac0]" />

          <div className="absolute left-1/2 top-[13px] -translate-x-1/2 w-[20px] h-[20px] rounded-full bg-[#e984ad]" />

        </div>
      )}

      {itemId ===
        'tambay_cap' && (
        <div className="relative w-[80px] h-[48px]">

          <div className="absolute left-[5px] top-[3px] w-[65px] h-[38px] rounded-t-[50%] rounded-b-lg bg-emerald-600" />

          <div className="absolute left-[37px] bottom-[1px] w-[43px] h-[10px] rounded-full bg-emerald-700" />

        </div>
      )}

      {itemId ===
        'scarf' && (
        <div className="relative w-[82px] h-[55px]">

          <div className="absolute left-0 top-[9px] w-[75px] h-[20px] rounded-full bg-[#c95d5d]" />

          <div className="absolute right-[15px] top-[22px] w-[20px] h-[32px] rotate-[12deg] rounded-b-lg bg-[#b94f4f]" />

        </div>
      )}

      {itemId ===
        'study_book' && (
        <div className="relative w-[60px] h-[48px]">

          <div className="absolute inset-0 rounded-md border-2 border-emerald-900 bg-emerald-700" />

          <div className="absolute left-[9px] top-[5px] bottom-[5px] w-[3px] bg-emerald-900/50" />

          <div className="absolute left-[22px] right-[8px] top-[15px] h-[3px] rounded-full bg-white/60" />

          <div className="absolute left-[22px] right-[15px] top-[25px] h-[3px] rounded-full bg-white/40" />

        </div>
      )}

      {itemId ===
        'coffee_cup' && (
        <div className="relative w-[60px] h-[65px]">

          <div className="absolute left-[17px] top-[2px] w-[7px] h-[17px] border-l-2 border-neutral-400 rotate-12 rounded-full" />

          <div className="absolute left-[31px] top-[4px] w-[7px] h-[15px] border-l-2 border-neutral-400 -rotate-12 rounded-full" />

          <div className="absolute left-[5px] bottom-[2px] w-[42px] h-[38px] rounded-b-xl border bg-white" />

          <div className="absolute right-[1px] bottom-[10px] w-[20px] h-[22px] rounded-full border-[4px] border-white" />

          <div className="absolute left-[8px] bottom-[35px] w-[36px] h-[7px] rounded-full bg-[#624231]" />

        </div>
      )}


      {itemId === 'matcha_cup' && (
      <div className="relative w-[62px] h-[70px]">

        {/* STRAW */}
        <div
          className="
            absolute
            left-[37px]
            top-0
            w-[4px]
            h-[31px]
            rotate-[8deg]
            rounded-full
            bg-[#d9c7a3]
            border border-[#bca984]
          "
        />

        {/* CUP */}
        <div
          className="
            absolute
            left-[8px]
            bottom-[1px]
            z-10
            w-[45px]
            h-[47px]
            overflow-hidden
            rounded-b-[12px]
            rounded-t-[7px]
            border-2
            border-white/80
            bg-white/25
            shadow-md
          "
        >
          {/* MATCHA */}
          <div
            className="
              absolute
              inset-x-[2px]
              bottom-[2px]
              h-[37px]
              rounded-b-[9px]
              bg-gradient-to-b
              from-[#a8c97f]
              via-[#8fb466]
              to-[#789c50]
            "
          />

          {/* MILK / FOAM */}
          <div
            className="
              absolute
              left-[2px]
              right-[2px]
              top-[5px]
              h-[9px]
              rounded-full
              bg-[#dce8c8]
            "
          />

          {/* MATCHA SWIRL */}
          <div
            className="
              absolute
              left-[7px]
              right-[7px]
              top-[8px]
              h-[4px]
              rounded-full
              bg-[#789d55]
            "
          />

          {/* GLASS SHINE */}
          <div
            className="
              absolute
              left-[5px]
              top-[14px]
              w-[4px]
              h-[22px]
              rounded-full
              bg-white/35
            "
          />
        </div>

        {/* RIM */}
        <div
          className="
            absolute
            left-[7px]
            bottom-[42px]
            z-20
            w-[47px]
            h-[8px]
            rounded-full
            border-2
            border-white/80
            bg-[#b8d493]
          "
        />

        {/* LEAF */}
        <div
          className="
            absolute
            left-[26px]
            bottom-[18px]
            z-20
            w-[12px]
            h-[7px]
            -rotate-[25deg]
            rounded-[100%_0_100%_0]
            bg-[#4f7f3b]
          "
        />
      </div>
    )}

      {itemId ===
        'graduation_cap' && (
        <div className="relative w-[85px] h-[65px]">

          <div className="absolute left-1/2 top-[7px] -translate-x-1/2 rotate-[-5deg] w-[80px] h-[46px] bg-neutral-900 [clip-path:polygon(50%_0%,100%_40%,50%_80%,0%_40%)]" />

          <div className="absolute left-1/2 top-[37px] -translate-x-1/2 w-[50px] h-[20px] rounded-b-lg bg-neutral-900" />

          <div className="absolute right-[14px] top-[27px] w-px h-[30px] bg-amber-500" />

        </div>
      )}

    </div>
  );
}

function FoodPreview({
  item,
}: {
  item: FoodItem;
}) {
  return (
    <div
      className="
        relative
        h-[95px]
        rounded-xl
        border
        border-neutral-200
        dark:border-neutral-800
        bg-white
        dark:bg-neutral-900
        overflow-hidden
        flex
        items-center
        justify-center
      "
    >

      {item.id ===
        'cat_tuna_crunch' && (
        <div className="relative w-[70px] h-[48px]">
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[62px] h-[22px] rounded-b-[18px] rounded-t-[8px] border border-[#74859b] bg-[#91a3bb]" />
          <div className="absolute left-[18px] top-[12px] w-[34px] h-[14px] rounded-full bg-[#e39d86]" />
          <div className="absolute left-[26px] top-[8px] w-[10px] h-[10px] rotate-45 bg-[#e39d86]" />
        </div>
      )}

      {item.id ===
        'dog_bone_bites' && (
        <div className="relative w-[64px] h-[42px] rotate-[-8deg]">
          <div className="absolute left-[14px] top-[10px] w-[36px] h-[18px] rounded-full bg-[#d1a372]" />
          <div className="absolute left-0 top-[5px] w-[16px] h-[16px] rounded-full bg-[#d1a372]" />
          <div className="absolute left-[4px] top-[20px] w-[14px] h-[14px] rounded-full bg-[#d1a372]" />
          <div className="absolute right-0 top-[5px] w-[16px] h-[16px] rounded-full bg-[#d1a372]" />
          <div className="absolute right-[4px] top-[20px] w-[14px] h-[14px] rounded-full bg-[#d1a372]" />
        </div>
      )}

      {item.id ===
        'hamster_seed_mix' && (
        <div className="relative w-[70px] h-[48px]">
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[60px] h-[20px] rounded-b-[18px] rounded-t-[8px] border border-[#9a6943] bg-[#bd8154]" />
          <span className="absolute left-[18px] top-[12px] w-[7px] h-[10px] rounded-full bg-[#e8d3a2] rotate-12" />
          <span className="absolute left-[30px] top-[10px] w-[6px] h-[9px] rounded-full bg-[#d0b179] -rotate-12" />
          <span className="absolute left-[40px] top-[13px] w-[7px] h-[10px] rounded-full bg-[#e8d3a2] rotate-[18deg]" />
        </div>
      )}

      {item.id ===
        'frog_fly_bites' && (
        <div className="relative w-[72px] h-[48px]">
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[60px] h-[20px] rounded-b-[18px] rounded-t-[8px] border border-[#7b8e58] bg-[#9fb878]" />
          <span className="absolute left-[20px] top-[12px] w-[10px] h-[10px] rounded-full bg-neutral-700" />
          <span className="absolute left-[35px] top-[10px] w-[9px] h-[9px] rounded-full bg-neutral-800" />
          <span className="absolute left-[26px] top-[18px] w-[18px] h-[2px] rounded-full bg-neutral-500" />
        </div>
      )}

      {item.id ===
        'chick_grain_mix' && (
        <div className="relative w-[72px] h-[48px]">
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[60px] h-[20px] rounded-b-[18px] rounded-t-[8px] border border-[#ccab3b] bg-[#f0cc54]" />
          <span className="absolute left-[19px] top-[12px] w-[6px] h-[6px] rounded-full bg-[#d79b23]" />
          <span className="absolute left-[29px] top-[10px] w-[6px] h-[6px] rounded-full bg-[#d79b23]" />
          <span className="absolute left-[39px] top-[14px] w-[6px] h-[6px] rounded-full bg-[#d79b23]" />
          <span className="absolute left-[46px] top-[10px] w-[6px] h-[6px] rounded-full bg-[#d79b23]" />
        </div>
      )}

      {item.id ===
        'seal_fish_bucket' && (
        <div className="relative w-[74px] h-[52px]">
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[56px] h-[30px] rounded-b-[12px] rounded-t-[6px] border border-[#5f7ca1] bg-[#82a7d6]" />
          <div className="absolute left-[16px] top-[13px] w-[16px] h-[9px] rounded-full bg-[#d9e6f6]" />
          <div className="absolute left-[28px] top-[12px] w-[16px] h-[9px] rounded-full bg-[#d9e6f6]" />
          <div className="absolute left-[11px] top-[12px] w-[7px] h-[7px] rotate-45 bg-[#d9e6f6]" />
          <div className="absolute left-[41px] top-[11px] w-[7px] h-[7px] rotate-45 bg-[#d9e6f6]" />
        </div>
      )}

      {item.id ===
        'emergency_biscuit' && (
        <div className="relative w-[60px] h-[60px] rotate-[8deg]">
          <div className="absolute inset-0 rounded-2xl border border-[#ad885a] bg-[#d4af7b]" />
          <span className="absolute left-[12px] top-[12px] w-[5px] h-[5px] rounded-full bg-[#b0824a]" />
          <span className="absolute left-[26px] top-[18px] w-[5px] h-[5px] rounded-full bg-[#b0824a]" />
          <span className="absolute left-[18px] top-[30px] w-[5px] h-[5px] rounded-full bg-[#b0824a]" />
          <span className="absolute left-[34px] top-[32px] w-[5px] h-[5px] rounded-full bg-[#b0824a]" />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   STAT BAR
========================================================= */

function StatBar({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          {icon}

          <span>
            {label}
          </span>
        </div>

        <span className="font-mono text-xs font-bold">
          {Math.round(value)}
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{
            width: `${clamp(value)}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function PetPage() {
  const [ownerId, setOwnerId] =
    useState<string | null>(null);

  const [pet, setPet] =
    useState<PetData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [selectedSpecies, setSelectedSpecies] =
    useState<PetSpecies>('seal');

  const [currentStreak, setCurrentStreak] =
    useState(0);

  const [streakLoading, setStreakLoading] =
    useState(true);

  const [petName, setPetName] =
    useState('');

  const [renameOpen, setRenameOpen] =
    useState(false);

  const [renameValue, setRenameValue] =
    useState('');

  const [renaming, setRenaming] =
    useState(false);

  const [
    readoptWarningOpen,
    setReadoptWarningOpen,
  ] = useState(false);

  const [
    readoptMode,
    setReadoptMode,
  ] = useState(false);

  const [creating, setCreating] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [jobLoading, setJobLoading] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState('');

  const [now, setNow] =
    useState(Date.now());

  const [inventory, setInventory] =
  useState<Record<string, InventoryItem>>({});

  const [shopLoading, setShopLoading] =
    useState<string | null>(null);

  const [wardrobeTab, setWardrobeTab] =
    useState<'shop' | 'inventory'>('shop');

  const [pantry, setPantry] =
  useState<
    Record<string, PantryItem>
  >({});

  const [
    feedOpen,
    setFeedOpen,
  ] = useState(false);

  const [
    feedingFoodId,
    setFeedingFoodId,
  ] = useState<string | null>(
    null
  );

  const [foodTab, setFoodTab] =
    useState<
      'shop' | 'pantry'
    >('shop');

  const [foodLoading, setFoodLoading] =
    useState<string | null>(
      null
    );

  /* =========================================================
     PET PARK STATE
  ========================================================= */

  const [
    parkOpen,
    setParkOpen,
  ] = useState(false);

  const [
    parkPets,
    setParkPets,
  ] = useState<ParkPet[]>([]);

  const [
    selectedParkPet,
    setSelectedParkPet,
  ] = useState<ParkPet | null>(
    null
  );

  const [
    parkLoading,
    setParkLoading,
  ] = useState<string | null>(
    null
  );

  const [
    parkMessage,
    setParkMessage,
  ] = useState('');

  const [
    giftTarget,
    setGiftTarget,
  ] = useState<ParkPet | null>(
    null
  );

  const [
    giftLoading,
    setGiftLoading,
  ] = useState<string | null>(
    null
  );

  const [
    parkIncoming,
    setParkIncoming,
  ] = useState<ParkInboxEvent | null>(
    null
  );

  const [
    parkSceneEvent,
    setParkSceneEvent,
  ] = useState<ParkSceneEvent | null>(
    null
  );

  const [
    parkPanelTab,
    setParkPanelTab,
  ] = useState<
    'actions' | 'chat'
  >('actions');

  const [
    parkChatMessages,
    setParkChatMessages,
  ] = useState<ParkChatMessage[]>([]);

  const [
    parkChatOlderMessages,
    setParkChatOlderMessages,
  ] = useState<ParkChatMessage[]>([]);

  const [
    parkChatLoadingOlder,
    setParkChatLoadingOlder,
  ] = useState(false);

  const [
    parkChatHasMore,
    setParkChatHasMore,
  ] = useState(true);

  const [
    parkChatText,
    setParkChatText,
  ] = useState('');

  const [
    parkChatSending,
    setParkChatSending,
  ] = useState(false);

  const [
    deletingParkChatMessageId,
    setDeletingParkChatMessageId,
  ] = useState<string | null>(
    null
  );

  const [
    parkChatCooldownUntil,
    setParkChatCooldownUntil,
  ] = useState(0);

  const [
    parkChatCooldownNow,
    setParkChatCooldownNow,
  ] = useState(() => Date.now());

  const [
    parkChatUnreadCount,
    setParkChatUnreadCount,
  ] = useState(0);

  const [
    parkChatNotice,
    setParkChatNotice,
  ] = useState<{
    id: string;
    petName: string;
    text: string;
  } | null>(null);

  const parkChatEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const parkChatScrollRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const parkChatLoadingOlderRef =
    useRef(false);

  const parkChatHistoryLoadedRef =
    useRef(false);

  const parkChatOldestCursorRef =
    useRef<{
      createdAt: unknown;
      id: string;
    } | null>(null);

  const parkPanelTabRef =
    useRef<'actions' | 'chat'>(
      'actions'
    );

  const parkChatReadyRef =
    useRef(false);

  const parkLastChatMessageIdRef =
    useRef<string | null>(
      null
    );

  const parkInteractionRef =
    useRef<Record<string, number>>({});

  const visibleParkChatMessages =
    useMemo(() => {
      const merged =
        new Map<
          string,
          ParkChatMessage
        >();

      for (
        const message of
        parkChatOlderMessages
      ) {
        merged.set(
          message.id,
          message
        );
      }

      for (
        const message of
        parkChatMessages
      ) {
        merged.set(
          message.id,
          message
        );
      }

      return Array.from(
        merged.values()
      ).sort(
        (a, b) => {
          const aTime =
            getTimestampMillis(
              a.createdAt
            ) || 0;

          const bTime =
            getTimestampMillis(
              b.createdAt
            ) || 0;

          if (aTime !== bTime) {
            return aTime - bTime;
          }

          return a.id.localeCompare(
            b.id
          );
        }
      );
    }, [
      parkChatMessages,
      parkChatOlderMessages,
    ]);

  const availablePantryFoods =
  useMemo(() => {
    if (!pet) {
      return [];
    }

    return FOODS.filter(
      (food) => {
        const quantity =
          pantry[
            food.id
          ]?.quantity || 0;

        const compatible =
          food.species ===
            pet.species ||
          food.species ===
            'all';

        return (
          quantity > 0 &&
          compatible
        );
      }
    );
  }, [pet, pantry]);

  const activeParkPets =
    useMemo(() => {
      const cutoff =
        now -
        3 * 60 * 1000;

      return parkPets
        .filter(
          (parkPet) => {
            if (
              parkPet.ownerId ===
              ownerId
            ) {
              return false;
            }

            if (
              parkPet.status !==
              'online'
            ) {
              return false;
            }

            const lastSeen =
              getTimestampMillis(
                parkPet.lastSeenAt
              ) || 0;

            return (
              lastSeen >=
              cutoff
            );
          }
        )
        .slice(0, 12);
    }, [
      parkPets,
      ownerId,
      now,
    ]);

  const giftableParkFoods =
    useMemo(() => {
      if (!giftTarget) {
        return [];
      }

      return FOODS.filter(
        (food) => {
          const quantity =
            pantry[
              food.id
            ]?.quantity ||
            0;

          const compatible =
            food.species ===
              'all' ||
            food.species ===
              giftTarget.species;

          return (
            quantity > 0 &&
            compatible
          );
        }
      );
    }, [
      giftTarget,
      pantry,
    ]);

  useEffect(() => {
    if (!parkOpen) {
      return;
    }

    const previousBodyOverflow =
      document.body.style.overflow;

    const previousHtmlOverflow =
      document.documentElement.style
        .overflow;

    document.body.style.overflow =
      'hidden';

    document.documentElement.style
      .overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        previousBodyOverflow;

      document.documentElement.style
        .overflow =
        previousHtmlOverflow;
    };
  }, [parkOpen]);

  const buyFood =
  async (
    food: FoodItem
  ) => {
    if (
      !ownerId ||
      !pet ||
      foodLoading
    ) {
      return;
    }

    if (
      pet.coins < food.price
    ) {
      setMessage(
        `You need ${food.price - pet.coins} more Tambay Coins.`
      );

      return;
    }

    setFoodLoading(
      food.id
    );

    setMessage('');

    try {
      const petRef =
        doc(
          db,
          'pets',
          ownerId
        );

      const pantryRef =
        doc(
          db,
          'pets',
          ownerId,
          'pantry',
          food.id
        );

      const result =
        await runTransaction(
          db,
          async (
            transaction
          ) => {
            const petSnapshot =
              await transaction.get(
                petRef
              );

            const pantrySnapshot =
              await transaction.get(
                pantryRef
              );

            if (
              !petSnapshot.exists()
            ) {
              throw new Error(
                'Pet not found.'
              );
            }

            const current =
              petSnapshot.data() as PetData;

            if (
              current.coins <
              food.price
            ) {
              throw new Error(
                'Not enough Tambay Coins.'
              );
            }

            const currentQuantity =
              pantrySnapshot.exists()
                ? Number(
                    (
                      pantrySnapshot.data() as PantryItem
                    )
                      .quantity || 0
                  )
                : 0;

            const nextCoins =
              current.coins -
              food.price;

            const nextQuantity =
              currentQuantity +
              1;

            transaction.update(
              petRef,
              {
                coins:
                  nextCoins,
              }
            );

            transaction.set(
              pantryRef,
              {
                foodId:
                  food.id,
                quantity:
                  nextQuantity,
                updatedAt:
                  Timestamp.now(),
              }
            );

            return {
              nextCoins,
              nextQuantity,
            };
          }
        );

      setPet(
        (previous) =>
          previous
            ? {
                ...previous,
                coins:
                  result.nextCoins,
              }
            : previous
      );

      setPantry(
        (previous) => ({
          ...previous,
          [food.id]: {
            foodId:
              food.id,
            quantity:
              result.nextQuantity,
          },
        })
      );

      setMessage(
        `${food.name} added to your pantry.`
      );
    } catch (error) {
      console.error(
        'Failed to buy food:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not buy food.'
      );
    } finally {
      setFoodLoading(
        null
      );
    }
  };

  const [
    petAnimation,
    setPetAnimation,
  ] = useState<PetAnimation>(
    'idle'
  );

  const petCondition =
    useMemo(() => {
      if (!pet) {
        return null;
      }

      const zeroStats = [
        pet.hunger <= 0,
        pet.happiness <= 0,
        pet.energy <= 0,
      ].filter(Boolean).length;

      if (zeroStats === 3) {
        return {
          severity: 'critical' as const,
          title: `${pet.name} needs care.`,
          description:
            'All needs are at 0. Feed them, let them rest, and spend time with them to help them recover.',
          dialogue: 'I need you right now...',
        };
      }

      if (pet.hunger <= 0) {
        return {
          severity: 'critical' as const,
          title: `${pet.name} is starving.`,
          description:
            'Happiness and energy will fall faster. Play and Study are locked until you feed them.',
          dialogue: 'I am really hungry...',
        };
      }

      if (pet.energy <= 0) {
        return {
          severity: 'critical' as const,
          title: `${pet.name} is exhausted.`,
          description:
            'They are too tired to Play or Study. Let them Sleep to recover energy.',
          dialogue: 'Too tired... need sleep.',
        };
      }

      if (pet.happiness <= 0) {
        return {
          severity: 'critical' as const,
          title: `${pet.name} feels lonely.`,
          description:
            'Spend some time playing with them when they have enough food and energy.',
          dialogue: 'Can we hang out for a bit?',
        };
      }

      if (pet.hunger <= 15) {
        return {
          severity: 'warning' as const,
          title: 'Your pet is very hungry.',
          description:
            'Play and Study are locked while hunger is this low.',
          dialogue: null,
        };
      }

      if (pet.hunger <= 35 || pet.energy <= 20 || pet.happiness <= 20) {
        return {
          severity: 'warning' as const,
          title: 'Your pet needs some attention.',
          description:
            'One of their needs is getting low. Take care of it before it reaches 0.',
          dialogue: null,
        };
      }

      return null;
    }, [pet]);

  const petAlert = petCondition;

  const jobsCompletedToday =
    pet?.jobDate === getPhilippineDate()
      ? pet.jobsCompletedToday || 0
      : 0;

  const getJobRemainingCooldown = (
    job: (typeof TAMBAY_JOBS)[number]
  ) => {
    if (!pet?.lastJobAt || !pet.lastJobId) {
      return 0;
    }

    const previousJob = TAMBAY_JOBS.find(
      (candidate) => candidate.id === pet.lastJobId
    );

    if (!previousJob) {
      return 0;
    }

    return Math.max(
      0,
      timestampToMs(pet.lastJobAt) +
        previousJob.cooldown -
        now
    );
  };

  const [
    petDialogue,
    setPetDialogue,
  ] = useState<string | null>(
    null
  );

  const petAnimationTimeoutRef =
    useRef<number | null>(
      null
    );

  const triggerPetAnimation =
    useCallback(
      (
        animation: PetAnimation,
        duration = 1800,
        dialogue:
          | string
          | null = null
      ) => {
        if (
          petAnimationTimeoutRef.current !==
          null
        ) {
          window.clearTimeout(
            petAnimationTimeoutRef.current
          );
        }

        setPetAnimation(
          animation
        );

        setPetDialogue(
          dialogue
        );

        petAnimationTimeoutRef.current =
          window.setTimeout(
            () => {
              setPetAnimation(
                'idle'
              );

              setPetDialogue(
                null
              );

              petAnimationTimeoutRef.current =
                null;
            },
            duration
          );
      },
      []
    );

  useEffect(() => {
    return () => {
      if (
        petAnimationTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          petAnimationTimeoutRef.current
        );
      }
    };
  }, []);

  /* =========================================================
     PET PARK PRESENCE
  ========================================================= */

  useEffect(() => {
    if (
      !parkOpen ||
      !ownerId ||
      !pet
    ) {
      return;
    }

    const presenceRef =
      doc(
        db,
        'petParkPresence',
        ownerId
      );

    const updatePresence =
      async () => {
        try {
          await setDoc(
            presenceRef,
            {
              petName:
                pet.name,

              species:
                pet.species,

              personality:
                pet.personality,

              level:
                pet.level,

              equipped: {
                ...EMPTY_EQUIPPED,
                ...pet.equipped,
              },

              status:
                'online',

              lastSeenAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        } catch (error) {
          console.error(
            'Failed to update park presence:',
            error
          );
        }
      };

    updatePresence();

    const interval =
      window.setInterval(
        updatePresence,
        60 * 1000
      );

    return () => {
      window.clearInterval(
        interval
      );

      setDoc(
        presenceRef,
        {
          status:
            'offline',

          lastSeenAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      ).catch(() => {});
    };
  }, [
    parkOpen,
    ownerId,
    pet?.name,
    pet?.species,
    pet?.personality,
    pet?.level,
    pet?.equipped?.head,
    pet?.equipped?.face,
    pet?.equipped?.neck,
    pet?.equipped?.prop,
  ]);

  /* =========================================================
     LIVE PARK PETS
  ========================================================= */

  useEffect(() => {
    if (
      !parkOpen ||
      !ownerId
    ) {
      return;
    }

    const parkQuery =
      query(
        collection(
          db,
          'petParkPresence'
        ),

        orderBy(
          'lastSeenAt',
          'desc'
        ),

        limit(20)
      );

    const unsubscribe =
      onSnapshot(
        parkQuery,

        (snapshot) => {
          const nextPets =
            snapshot.docs.map(
              (snapshotDoc) => {
                const data =
                  snapshotDoc.data();

                return {
                  ownerId:
                    snapshotDoc.id,

                  petName:
                    String(
                      data.petName ||
                        'Tambayan Pet'
                    ),

                  species:
                    data.species as PetSpecies,

                  personality:
                    data.personality as PetPersonality,

                  level:
                    Number(
                      data.level ||
                        1
                    ),

                  equipped: {
                    ...EMPTY_EQUIPPED,
                    ...(
                      data.equipped ||
                      {}
                    ),
                  },

                  status:
                    data.status ===
                    'offline'
                      ? 'offline'
                      : 'online',

                  lastSeenAt:
                    data.lastSeenAt,
                } as ParkPet;
              }
            );

          setParkPets(
            nextPets
          );
        },

        (error) => {
          console.error(
            'Pet Park listener failed:',
            error
          );

          setParkMessage(
            'Could not load the Pet Park.'
          );
        }
      );

    /*
     * At 12:00 AM Philippine time, restart the chat view.
     * The fresh query will only include the new day's
     * messages. We reload the page because this page also
     * has several refs/cursors tied to the current chat
     * window, making the reset deterministic and cheap.
     */
    const nextMidnight =
      getNextPhilippineMidnight();

    const midnightDelay =
      Math.max(
        1000,
        nextMidnight.getTime() -
          Date.now() +
          250
      );

    const midnightTimer =
      window.setTimeout(
        () => {
          window.location.reload();
        },
        midnightDelay
      );

    return () => {
      unsubscribe();

      window.clearTimeout(
        midnightTimer
      );
    };
  }, [
    parkOpen,
    ownerId,
  ]);

  /* =========================================================
     PET PARK INBOX
  ========================================================= */

  useEffect(() => {
    if (
      !ownerId ||
      !pet
    ) {
      return;
    }

    const inboxQuery =
      query(
        collection(
          db,
          'pets',
          ownerId,
          'parkInbox'
        ),

        orderBy(
          'createdAt',
          'desc'
        ),

        limit(10)
      );

    const unsubscribe =
      onSnapshot(
        inboxQuery,

        (snapshot) => {
          const unread =
            snapshot.docs.find(
              (snapshotDoc) =>
                snapshotDoc.data()
                  .seen !== true
            );

          if (!unread) {
            return;
          }

          const data =
            unread.data();

          const event:
            ParkInboxEvent = {
            id:
              unread.id,

            type:
              data.type as ParkInteractionType,

            fromOwnerId:
              data.fromOwnerId
                ? String(
                    data.fromOwnerId
                  )
                : null,

            fromPetName:
              String(
                data.fromPetName ||
                  'A Tambayan pet'
              ),

            fromSpecies:
              data.fromSpecies as PetSpecies,

            foodId:
              data.foodId ||
              null,

            foodName:
              data.foodName ||
              null,

            messagePreview:
              data.messagePreview
                ? String(
                    data.messagePreview
                  )
                : null,

            createdAt:
              data.createdAt,

            seen:
              false,
          };

          setParkIncoming(
            event
          );

          if (
            event.type !==
            'chat'
          ) {
            setParkSceneEvent({
              id: Date.now(),
              type:
                event.type,
              otherOwnerId:
                event.fromOwnerId ||
                null,
              otherPetName:
                event.fromPetName,
              direction:
                'incoming',
              foodName:
                event.foodName ||
                null,
            });
          }

          let dialogue = '';

          if (
            event.type ===
            'wave'
          ) {
            dialogue =
              `${event.fromPetName} waved at me!`;
          }

          if (
            event.type ===
            'play'
          ) {
            dialogue =
              `${event.fromPetName} wants to play!`;
          }

          if (
            event.type ===
            'sit'
          ) {
            dialogue =
              `${event.fromPetName} sat with me.`;
          }

          if (
            event.type ===
            'treat'
          ) {
            dialogue =
              `${event.fromPetName} sent me ${event.foodName || 'a treat'}!`;
          }

          if (
            event.type ===
            'chat'
          ) {
            dialogue =
              `${event.fromPetName} sent a message.`;
          }

          triggerPetAnimation(
            event.type ===
              'play'
              ? 'play'
              : 'idle',
            4000,
            dialogue
          );

          updateDoc(
            unread.ref,
            {
              seen: true,
            }
          ).catch(
            (error) => {
              console.error(
                'Failed to mark park event:',
                error
              );
            }
          );
        },
        (error) => {
          console.error(
            'Pet Park inbox listener failed:',
            error
          );
        }
      );

    return () =>
      unsubscribe();
  }, [
    ownerId,
    pet?.name,
    triggerPetAnimation,
  ]);

  useEffect(() => {
    if (!parkIncoming) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          setParkIncoming(
            null
          );
        },
        6000
      );

    return () =>
      window.clearTimeout(
        timeout
      );
  }, [parkIncoming]);

  /* =========================================================
     LIVE GLOBAL PET PARK CHAT
     - Only the newest 10 messages are live.
     - Older messages load 10 at a time on demand.
  ========================================================= */

  useEffect(() => {
    parkPanelTabRef.current =
      parkPanelTab;
  }, [parkPanelTab]);

  useEffect(() => {
    if (
      !parkOpen ||
      !ownerId
    ) {
      setParkChatMessages([]);
      setParkChatOlderMessages([]);
      setParkChatUnreadCount(0);
      setParkChatNotice(null);
      setParkChatHasMore(true);
      setParkChatLoadingOlder(false);

      parkChatReadyRef.current =
        false;

      parkLastChatMessageIdRef.current =
        null;

      parkChatOldestCursorRef.current =
        null;

      parkChatHistoryLoadedRef.current =
        false;

      parkChatLoadingOlderRef.current =
        false;

      return;
    }

    const currentDayStart =
      Timestamp.fromDate(
        getPhilippineDayStart()
      );

    const messagesQuery =
      query(
        collection(
          db,
          'petParkChats',
          GLOBAL_PARK_CHAT_ID,
          'messages'
        ),
        where(
          'createdAt',
          '>=',
          currentDayStart
        ),
        orderBy(
          'createdAt',
          'desc'
        ),
        orderBy(
          documentId(),
          'desc'
        ),
        limit(10)
      );

    const unsubscribe =
      onSnapshot(
        messagesQuery,
        (snapshot) => {
          const nextMessages =
            snapshot.docs
              .map(
                (messageDoc) => {
                  const data =
                    messageDoc.data();

                  return {
                    id:
                      messageDoc.id,

                    senderOwnerId:
                      String(
                        data.senderOwnerId ||
                          ''
                      ),

                    senderPetName:
                      String(
                        data.senderPetName ||
                          'Pet'
                      ),

                    text:
                      String(
                        data.text ||
                          ''
                      ),

                    createdAt:
                      data.createdAt,
                  } as ParkChatMessage;
                }
              )
              .reverse();

          /*
           * Replace the live window instead of
           * accumulating messages automatically.
           * This keeps the live listener at 10.
           */
          setParkChatMessages(
            nextMessages
          );

          if (
            !parkChatHistoryLoadedRef.current
          ) {
            const oldestDoc =
              snapshot.docs[
                snapshot.docs.length -
                  1
              ];

            if (oldestDoc) {
              parkChatOldestCursorRef.current = {
                createdAt:
                  oldestDoc.data()
                    .createdAt,
                id:
                  oldestDoc.id,
              };
            } else {
              parkChatOldestCursorRef.current =
                null;
            }

            /*
             * Exactly 10 means there MAY be older
             * messages. We only verify when the
             * user taps Load older.
             */
            setParkChatHasMore(
              snapshot.docs.length ===
                10
            );
          }

          const newestMessage =
            nextMessages[
              nextMessages.length -
                1
            ];

          if (
            !parkChatReadyRef.current
          ) {
            parkChatReadyRef.current =
              true;

            parkLastChatMessageIdRef.current =
              newestMessage?.id ||
              null;

            return;
          }

          if (
            !newestMessage ||
            newestMessage.id ===
              parkLastChatMessageIdRef.current
          ) {
            return;
          }

          parkLastChatMessageIdRef.current =
            newestMessage.id;

          if (
            newestMessage.senderOwnerId ===
            ownerId
          ) {
            return;
          }

          if (
            parkPanelTabRef.current ===
            'chat'
          ) {
            setParkChatUnreadCount(
              0
            );

            return;
          }

          setParkChatUnreadCount(
            (previous) =>
              previous + 1
          );

          setParkChatNotice({
            id:
              newestMessage.id,

            petName:
              newestMessage.senderPetName,

            text:
              newestMessage.text,
          });
        },
        (error) => {
          console.error(
            'Global Pet Park chat listener failed:',
            error
          );

          setParkMessage(
            'Could not load the Pet Park chat.'
          );
        }
      );

    return () =>
      unsubscribe();
  }, [
    parkOpen,
    ownerId,
  ]);

  const loadOlderParkChatMessages =
    async () => {
      if (
        !parkOpen ||
        !ownerId ||
        parkChatLoadingOlder ||
        !parkChatHasMore
      ) {
        return;
      }

      const cursor =
        parkChatOldestCursorRef.current;

      if (!cursor) {
        setParkChatHasMore(
          false
        );

        return;
      }

      const scrollElement =
        parkChatScrollRef.current;

      const previousScrollHeight =
        scrollElement?.scrollHeight ||
        0;

      parkChatLoadingOlderRef.current =
        true;

      setParkChatLoadingOlder(
        true
      );

      try {
        const olderQuery =
          query(
            collection(
              db,
              'petParkChats',
              GLOBAL_PARK_CHAT_ID,
              'messages'
            ),
            where(
              'createdAt',
              '>=',
              Timestamp.fromDate(
                getPhilippineDayStart()
              )
            ),
            orderBy(
              'createdAt',
              'desc'
            ),
            orderBy(
              documentId(),
              'desc'
            ),
            startAfter(
              cursor.createdAt,
              cursor.id
            ),
            limit(10)
          );

        const snapshot =
          await getDocs(
            olderQuery
          );

        const olderMessages =
          snapshot.docs
            .map(
              (messageDoc) => {
                const data =
                  messageDoc.data();

                return {
                  id:
                    messageDoc.id,

                  senderOwnerId:
                    String(
                      data.senderOwnerId ||
                        ''
                    ),

                  senderPetName:
                    String(
                      data.senderPetName ||
                        'Pet'
                    ),

                  text:
                    String(
                      data.text ||
                        ''
                    ),

                  createdAt:
                    data.createdAt,
                } as ParkChatMessage;
              }
            )
            .reverse();

        if (
          snapshot.docs.length ===
          0
        ) {
          setParkChatHasMore(
            false
          );

          return;
        }

        parkChatHistoryLoadedRef.current =
          true;

        setParkChatOlderMessages(
          (previous) => {
            const merged =
              new Map<
                string,
                ParkChatMessage
              >();

            for (
              const message of
              olderMessages
            ) {
              merged.set(
                message.id,
                message
              );
            }

            for (
              const message of
              previous
            ) {
              merged.set(
                message.id,
                message
              );
            }

            return Array.from(
              merged.values()
            ).sort(
              (a, b) => {
                const aTime =
                  getTimestampMillis(
                    a.createdAt
                  ) || 0;

                const bTime =
                  getTimestampMillis(
                    b.createdAt
                  ) || 0;

                if (
                  aTime !==
                  bTime
                ) {
                  return (
                    aTime -
                    bTime
                  );
                }

                return a.id.localeCompare(
                  b.id
                );
              }
            );
          }
        );

        const oldestDoc =
          snapshot.docs[
            snapshot.docs.length -
              1
          ];

        parkChatOldestCursorRef.current = {
          createdAt:
            oldestDoc.data()
              .createdAt,
          id:
            oldestDoc.id,
        };

        setParkChatHasMore(
          snapshot.docs.length ===
            10
        );

        window.requestAnimationFrame(
          () => {
            if (
              scrollElement
            ) {
              const nextScrollHeight =
                scrollElement.scrollHeight;

              scrollElement.scrollTop +=
                nextScrollHeight -
                previousScrollHeight;
            }

            parkChatLoadingOlderRef.current =
              false;
          }
        );
      } catch (error) {
        console.error(
          'Failed to load older park messages:',
          error
        );

        setParkMessage(
          'Could not load older park messages.'
        );
      } finally {
        setParkChatLoadingOlder(
          false
        );

        window.setTimeout(
          () => {
            parkChatLoadingOlderRef.current =
              false;
          },
          0
        );
      }
    };

  useEffect(() => {
    if (
      parkPanelTab !==
      'chat' ||
      parkChatLoadingOlderRef.current
    ) {
      return;
    }

    setParkChatUnreadCount(
      0
    );

    setParkChatNotice(
      null
    );

    const frame =
      window.requestAnimationFrame(
        () => {
          parkChatEndRef.current
            ?.scrollIntoView({
              behavior: 'smooth',
              block: 'end',
            });
        }
      );

    return () =>
      window.cancelAnimationFrame(
        frame
      );
  }, [
    visibleParkChatMessages.length,
    parkPanelTab,
  ]);

  useEffect(() => {
    if (!parkChatNotice) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          setParkChatNotice(
            null
          );
        },
        5000
      );

    return () =>
      window.clearTimeout(
        timeout
      );
  }, [parkChatNotice]);

  useEffect(() => {
    if (!parkSceneEvent) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          setParkSceneEvent(
            null
          );
        },
        4800
      );

    return () =>
      window.clearTimeout(
        timeout
      );
  }, [parkSceneEvent]);

  /* =========================================================
     PET PARK INTERACTIONS
  ========================================================= */

  const PARK_CHAT_COOLDOWN_MS =
    5 * 1000;

  const parkChatCooldownRemaining =
    Math.max(
      0,
      parkChatCooldownUntil -
        parkChatCooldownNow
    );

  useEffect(() => {
    if (
      parkChatCooldownUntil <=
      Date.now()
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setParkChatCooldownNow(
            Date.now()
          );
        },
        250
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    parkChatCooldownUntil,
  ]);

  const deleteParkChatMessage =
    async (
      message:
        ParkChatMessage
    ) => {
      if (
        !ownerId ||
        message.senderOwnerId !==
          ownerId ||
        deletingParkChatMessageId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          'Delete this message?'
        );

      if (!confirmed) {
        return;
      }

      setDeletingParkChatMessageId(
        message.id
      );

      try {
        await deleteDoc(
          doc(
            db,
            'petParkChats',
            GLOBAL_PARK_CHAT_ID,
            'messages',
            message.id
          )
        );

        /*
         * Remove immediately from paged history too.
         * The live latest-10 listener handles its own
         * window automatically.
         */
        setParkChatOlderMessages(
          (previous) =>
            previous.filter(
              (item) =>
                item.id !==
                message.id
            )
        );

        setParkChatMessages(
          (previous) =>
            previous.filter(
              (item) =>
                item.id !==
                message.id
            )
        );

        setParkMessage(
          'Message deleted.'
        );
      } catch (error) {
        console.error(
          'Pet Park message delete failed:',
          error
        );

        setParkMessage(
          'Could not delete that message.'
        );
      } finally {
        setDeletingParkChatMessageId(
          null
        );
      }
    };

  const sendParkChatMessage =
    async () => {
      if (
        !ownerId ||
        !pet ||
        parkChatSending
      ) {
        return;
      }

      const nowMs =
        Date.now();

      if (
        parkChatCooldownUntil >
        nowMs
      ) {
        setParkMessage(
          'Slow down a little — you can send another park message in a few seconds.'
        );

        return;
      }

      const cleanText =
        parkChatText
          .trim()
          .replace(
            /\s+/g,
            ' '
          );

      if (!cleanText) {
        return;
      }

      if (
        cleanText.length >
        180
      ) {
        setParkMessage(
          'Keep park messages under 180 characters.'
        );

        return;
      }

      setParkChatSending(
        true
      );

      setParkMessage('');

      try {
        const chatRef =
          doc(
            db,
            'petParkChats',
            GLOBAL_PARK_CHAT_ID
          );

        const messageRef =
          doc(
            collection(
              db,
              'petParkChats',
              GLOBAL_PARK_CHAT_ID,
              'messages'
            )
          );

        const createdAt =
          Timestamp.now();

        /*
         * Firestore-backed cooldown.
         * This makes the 5-second anti-spam delay harder
         * to bypass than a client-only timer.
         */
        const cooldownRef =
          doc(
            db,
            'petParkChatCooldowns',
            ownerId
          );

        await runTransaction(
          db,
          async (
            transaction
          ) => {
            const cooldownSnapshot =
              await transaction.get(
                cooldownRef
              );

            const previousSentAt =
              cooldownSnapshot.exists()
                ? getTimestampMillis(
                    cooldownSnapshot.data()
                      .lastSentAt
                  ) || 0
                : 0;

            const transactionNow =
              Date.now();

            if (
              transactionNow -
                previousSentAt <
              PARK_CHAT_COOLDOWN_MS
            ) {
              throw new Error(
                'PARK_CHAT_COOLDOWN'
              );
            }

            transaction.set(
              cooldownRef,
              {
                lastSentAt:
                  Timestamp.fromMillis(
                    transactionNow
                  ),
              },
              {
                merge: true,
              }
            );
          }
        );

        await setDoc(
          chatRef,
          {
            kind:
              'global_park_chat',

            lastMessage:
              cleanText,

            lastSenderOwnerId:
              ownerId,

            lastSenderPetName:
              pet.name,

            updatedAt:
              createdAt,
          },
          {
            merge: true,
          }
        );

        await setDoc(
          messageRef,
          {
            senderOwnerId:
              ownerId,

            senderPetName:
              pet.name,

            senderSpecies:
              pet.species,

            senderLevel:
              pet.level,

            text:
              cleanText,

            createdAt,
          }
        );

        setParkChatText('');

        const nextCooldown =
          Date.now() +
          PARK_CHAT_COOLDOWN_MS;

        setParkChatCooldownUntil(
          nextCooldown
        );

        setParkChatCooldownNow(
          Date.now()
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            'PARK_CHAT_COOLDOWN'
        ) {
          const nextCooldown =
            Date.now() +
            PARK_CHAT_COOLDOWN_MS;

          setParkChatCooldownUntil(
            nextCooldown
          );

          setParkChatCooldownNow(
            Date.now()
          );

          setParkMessage(
            'Slow down a little — park chat has a 5-second cooldown.'
          );

          return;
        }

        console.error(
          'Pet Park chat send failed:',
          error
        );

        setParkMessage(
          'Could not send that message.'
        );
      } finally {
        setParkChatSending(
          false
        );
      }
    };

  const sendParkInteraction =
    async (
      target: ParkPet,
      type:
        | 'wave'
        | 'play'
        | 'sit'
    ) => {
      if (
        !ownerId ||
        !pet ||
        parkLoading
      ) {
        return;
      }

      const cooldownKey =
        `${target.ownerId}_${type}`;

      const lastInteraction =
        parkInteractionRef
          .current[
            cooldownKey
          ] || 0;

      if (
        Date.now() -
          lastInteraction <
        10 * 1000
      ) {
        setParkMessage(
          'Give them a moment first.'
        );

        return;
      }

      const loadingKey =
        `${type}_${target.ownerId}`;

      setParkLoading(
        loadingKey
      );

      setParkMessage('');

      try {
        const inboxRef =
          doc(
            collection(
              db,
              'pets',
              target.ownerId,
              'parkInbox'
            )
          );

        await setDoc(
          inboxRef,
          {
            type,

            fromOwnerId:
              ownerId,

            fromPetName:
              pet.name,

            fromSpecies:
              pet.species,

            createdAt:
              serverTimestamp(),

            seen: false,
          }
        );

        parkInteractionRef
          .current[
            cooldownKey
          ] = Date.now();

        setParkSceneEvent({
          id: Date.now(),
          type,
          otherOwnerId:
            target.ownerId,
          otherPetName:
            target.petName,
          direction:
            'outgoing',
        });

        if (
          type === 'wave'
        ) {
          setParkMessage(
            `${pet.name} waved at ${target.petName}.`
          );

          triggerPetAnimation(
            'idle',
            2500,
            `Hi ${target.petName}!`
          );
        }

        if (
          type === 'play'
        ) {
          setParkMessage(
            `${pet.name} invited ${target.petName} to play.`
          );

          triggerPetAnimation(
            'play',
            2800,
            'Come play!'
          );
        }

        if (
          type === 'sit'
        ) {
          setParkMessage(
            `${pet.name} sat beside ${target.petName}.`
          );

          triggerPetAnimation(
            'idle',
            3000,
            'Just hanging out.'
          );
        }
      } catch (error) {
        console.error(
          'Park interaction failed:',
          error
        );

        setParkMessage(
          'Could not send the interaction.'
        );
      } finally {
        setParkLoading(
          null
        );
      }
    };

  const sendParkTreat =
    async (
      target: ParkPet,
      food: FoodItem
    ) => {
      if (
        !ownerId ||
        !pet ||
        giftLoading
      ) {
        return;
      }

      if (
        food.species !==
          'all' &&
        food.species !==
          target.species
      ) {
        setParkMessage(
          `${food.name} is not suitable for ${target.petName}.`
        );

        return;
      }

      setGiftLoading(
        food.id
      );

      setParkMessage('');

      try {
        const senderFoodRef =
          doc(
            db,
            'pets',
            ownerId,
            'pantry',
            food.id
          );

        const receiverFoodRef =
          doc(
            db,
            'pets',
            target.ownerId,
            'pantry',
            food.id
          );

        const inboxRef =
          doc(
            collection(
              db,
              'pets',
              target.ownerId,
              'parkInbox'
            )
          );

        const result =
          await runTransaction(
            db,
            async (
              transaction
            ) => {
              const senderSnapshot =
                await transaction.get(
                  senderFoodRef
                );

              const receiverSnapshot =
                await transaction.get(
                  receiverFoodRef
                );

              if (
                !senderSnapshot.exists()
              ) {
                throw new Error(
                  'That food is no longer in your pantry.'
                );
              }

              const senderQuantity =
                Number(
                  (
                    senderSnapshot.data() as PantryItem
                  ).quantity ||
                    0
                );

              if (
                senderQuantity <=
                0
              ) {
                throw new Error(
                  'That food is already gone.'
                );
              }

              const receiverQuantity =
                receiverSnapshot.exists()
                  ? Number(
                      (
                        receiverSnapshot.data() as PantryItem
                      ).quantity ||
                        0
                    )
                  : 0;

              const currentTime =
                Timestamp.now();

              if (
                senderQuantity <=
                1
              ) {
                transaction.delete(
                  senderFoodRef
                );
              } else {
                transaction.update(
                  senderFoodRef,
                  {
                    quantity:
                      senderQuantity -
                      1,

                    updatedAt:
                      currentTime,
                  }
                );
              }

              transaction.set(
                receiverFoodRef,
                {
                  foodId:
                    food.id,

                  quantity:
                    receiverQuantity +
                    1,

                  updatedAt:
                    currentTime,
                }
              );

              transaction.set(
                inboxRef,
                {
                  type:
                    'treat',

                  fromOwnerId:
                    ownerId,

                  fromPetName:
                    pet.name,

                  fromSpecies:
                    pet.species,

                  foodId:
                    food.id,

                  foodName:
                    food.name,

                  createdAt:
                    currentTime,

                  seen: false,
                }
              );

              return {
                remaining:
                  senderQuantity -
                  1,
              };
            }
          );

        setPantry(
          (previous) => {
            if (
              result.remaining <=
              0
            ) {
              const next = {
                ...previous,
              };

              delete next[
                food.id
              ];

              return next;
            }

            return {
              ...previous,

              [food.id]: {
                ...previous[
                  food.id
                ],

                foodId:
                  food.id,

                quantity:
                  result.remaining,
              },
            };
          }
        );

        setParkMessage(
          `Treat sent! ${pet.name} brought ${food.name} to ${target.petName}.`
        );

        setParkSceneEvent({
          id: Date.now(),
          type: 'treat',
          otherOwnerId:
            target.ownerId,
          otherPetName:
            target.petName,
          direction:
            'outgoing',
          foodName:
            food.name,
        });

        triggerPetAnimation(
          'idle',
          3000,
          `For ${target.petName}!`
        );

        setGiftTarget(
          null
        );
      } catch (error) {
        console.error(
          'Treat gift failed:',
          error
        );

        setParkMessage(
          error instanceof Error
            ? error.message
            : 'Could not send the treat.'
        );
      } finally {
        setGiftLoading(
          null
        );
      }
    };

  /* =========================================================
     CLOCK
  ========================================================= */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          setNow(Date.now());
        },
        1000
      );

    return () =>
      clearInterval(interval);
  }, []);

  /* =========================================================
     LOAD PET
  ========================================================= */

  useEffect(() => {
    const loadPet = async () => {
      const id =
        getPetOwnerId();

      setOwnerId(id);

      if (!id) {
        setCurrentStreak(0);
        setStreakLoading(false);
        setLoading(false);
        return;
      }

      try {
        /*
         * Load Tambayan streak.
         * The Pink Axolotl becomes available
         * at an effective 14-day streak.
         */
        try {
          const userSnapshot =
            await getDoc(
              doc(
                db,
                'users',
                id
              )
            );

          if (
            userSnapshot.exists()
          ) {
            const userData =
              userSnapshot.data();

            const streakData =
              userData.streak ||
              {};

            const rawCurrent =
              typeof streakData.current ===
              'number'
                ? streakData.current
                : 0;

            const lastActiveDate =
              typeof streakData.lastActiveDate ===
              'string'
                ? streakData.lastActiveDate
                : null;

            setCurrentStreak(
              getEffectiveStreak(
                rawCurrent,
                lastActiveDate
              )
            );
          } else {
            setCurrentStreak(0);
          }
        } catch (streakError) {
          console.error(
            'Failed to load streak:',
            streakError
          );

          setCurrentStreak(0);
        } finally {
          setStreakLoading(false);
        }

        const petRef =
          doc(
            db,
            'pets',
            id
          );

        const snapshot =
          await getDoc(
            petRef
          );

          if (snapshot.exists()) {
            const rawData =
              snapshot.data() as PetData;

            let normalizedPet: PetData =
              {
                ...rawData,

                equipped: {
                  ...EMPTY_EQUIPPED,
                  ...(rawData.equipped ||
                    {}),
                },
              };

            const decayResult =
              applyPassiveNeedDecay(
                normalizedPet
              );

            if (decayResult.changed) {
              normalizedPet = {
                ...normalizedPet,
                ...decayResult.pet,
              };

              await updateDoc(
                petRef,
                {
                  hunger:
                    normalizedPet.hunger,
                  happiness:
                    normalizedPet.happiness,
                  energy:
                    normalizedPet.energy,
                  lastNeedTickAt:
                    Timestamp.now(),
                }
              );
            }

            setPet(
              normalizedPet
            );

            const inventorySnapshot =
              await getDocs(
                collection(
                  db,
                  'pets',
                  id,
                  'inventory'
                )
              );

            const loadedInventory:
              Record<
                string,
                InventoryItem
              > = {};

            inventorySnapshot.forEach(
              (inventoryDoc) => {
                const data =
                  inventoryDoc.data() as InventoryItem;

                loadedInventory[
                  inventoryDoc.id
                ] = {
                  ...data,
                  itemId:
                    data.itemId ||
                    inventoryDoc.id,
                };
              }
            );

            setInventory(
              loadedInventory
            );

            const pantrySnapshot =
              await getDocs(
                collection(
                  db,
                  'pets',
                  id,
                  'pantry'
                )
              );

            const loadedPantry:
              Record<
                string,
                PantryItem
              > = {};

            pantrySnapshot.forEach(
              (pantryDoc) => {
                const data =
                  pantryDoc.data() as PantryItem;

                loadedPantry[
                  pantryDoc.id
                ] = {
                  ...data,
                  foodId:
                    data.foodId ||
                    pantryDoc.id,
                  quantity:
                    typeof data.quantity ===
                    'number'
                      ? data.quantity
                      : 0,
                };
              }
            );

            setPantry(
              loadedPantry
            );
          }
      } catch (error) {
        console.error(
          'Failed to load pet:',
          error
        );

        setMessage(
          'Could not load your pet.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPet();
  }, []);

  /* =========================================================
     ADOPT PET
  ========================================================= */

  const adoptPet =
    async () => {
      if (
        !ownerId ||
        creating
      ) {
        return;
      }

      const cleanName =
        petName.trim();

      if (
        cleanName.length < 2
      ) {
        setMessage(
          'Give your pet a name with at least 2 characters.'
        );

        return;
      }

      if (
        cleanName.length > 20
      ) {
        setMessage(
          'Pet names can only be up to 20 characters.'
        );

        return;
      }

      const selectedPetOption =
        PETS.find(
          (candidate) =>
            candidate.id ===
            selectedSpecies
        );

      const requiredStreak =
        selectedPetOption?.unlockStreak ||
        0;

      if (
        requiredStreak > 0 &&
        currentStreak <
          requiredStreak
      ) {
        setMessage(
          `Reach a ${requiredStreak}-day streak to unlock the Pink Axolotl.`
        );

        return;
      }

      setCreating(true);
      setMessage('');

      try {
        /*
         * Re-check the streak from Firestore
         * for streak-locked pets before adoption.
         */
        if (
          requiredStreak > 0
        ) {
          const userSnapshot =
            await getDoc(
              doc(
                db,
                'users',
                ownerId
              )
            );

          const userData =
            userSnapshot.exists()
              ? userSnapshot.data()
              : {};

          const streakData =
            userData.streak ||
            {};

          const verifiedStreak =
            getEffectiveStreak(
              typeof streakData.current ===
                'number'
                ? streakData.current
                : 0,
              typeof streakData.lastActiveDate ===
                'string'
                ? streakData.lastActiveDate
                : null
            );

          setCurrentStreak(
            verifiedStreak
          );

          if (
            verifiedStreak <
            requiredStreak
          ) {
            setMessage(
              `Reach a ${requiredStreak}-day streak to unlock the Pink Axolotl.`
            );

            return;
          }
        }

        const personality =
          randomPersonality();

        const newPet: PetData = {
          ownerId,

          name: cleanName,

          species:
            selectedSpecies,

          personality,

          level: 1,

          xp: 0,

          coins: 100,

          hunger: 80,

          happiness: 80,

          energy: 80,

          evolutionStage: 1,

          equipped: {
            ...EMPTY_EQUIPPED,
          },

          lastFedAt: null,

          lastPlayedAt: null,

          lastStudyAt: null,

          lastSleptAt: null,

          lastDailyRewardDate:
            null,

          dailyRewardDay: 0,
        };

        const petRef =
          doc(
            db,
            'pets',
            ownerId
          );

        if (readoptMode) {
          /*
           * Readoption is a full Tambayan Pet reset.
           *
           * We clear pet-owned inventory and pantry,
           * replace the pet document, and remove any
           * stale Pet Park presence.
           *
           * The user's Tambayan streak lives under
           * users/{ownerId}, so it is intentionally
           * NOT touched here.
           */
          const [
            inventorySnapshot,
            pantrySnapshot,
          ] = await Promise.all([
            getDocs(
              collection(
                db,
                'pets',
                ownerId,
                'inventory'
              )
            ),

            getDocs(
              collection(
                db,
                'pets',
                ownerId,
                'pantry'
              )
            ),
          ]);

          const resetBatch =
            writeBatch(db);

          inventorySnapshot.docs.forEach(
            (inventoryDoc) => {
              resetBatch.delete(
                inventoryDoc.ref
              );
            }
          );

          pantrySnapshot.docs.forEach(
            (pantryDoc) => {
              resetBatch.delete(
                pantryDoc.ref
              );
            }
          );

          resetBatch.delete(
            doc(
              db,
              'petParkPresence',
              ownerId
            )
          );

          resetBatch.set(
            petRef,
            {
              ...newPet,

              createdAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),

              lastNeedTickAt:
                serverTimestamp(),
            }
          );

          await resetBatch.commit();

          setInventory({});
          setPantry({});
          setWardrobeTab('shop');
          setFoodTab('shop');
          setFeedOpen(false);
          setSelectedParkPet(null);
          setGiftTarget(null);
          setParkOpen(false);
        } else {
          await setDoc(
            petRef,
            {
              ...newPet,

              createdAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),

              lastNeedTickAt:
                serverTimestamp(),
            }
          );
        }

        setPet(newPet);
        setReadoptMode(false);
        setPetName('');

        setMessage(
          readoptMode
            ? `${cleanName} is your new Tambayan Pet. Everything from your previous pet has been reset.`
            : `${cleanName} is now your Tambayan Pet.`
        );
      } catch (error) {
        console.error(
          'Failed to adopt pet:',
          error
        );

        setMessage(
          'Could not adopt your pet. Please try again.'
        );
      } finally {
        setCreating(false);
      }
    };

  /* =========================================================
     RENAME PET
  ========================================================= */

  const renamePet =
    async () => {
      if (
        !ownerId ||
        !pet ||
        renaming
      ) {
        return;
      }

      const cleanName =
        renameValue.trim();

      if (cleanName.length < 2) {
        setMessage(
          'Give your pet a nickname with at least 2 characters.'
        );
        return;
      }

      if (cleanName.length > 20) {
        setMessage(
          'Pet nicknames can only be up to 20 characters.'
        );
        return;
      }

      if (cleanName === pet.name) {
        setRenameOpen(false);
        return;
      }

      setRenaming(true);
      setMessage('');

      try {
        await updateDoc(
          doc(
            db,
            'pets',
            ownerId
          ),
          {
            name: cleanName,
            updatedAt:
              serverTimestamp(),
          }
        );

        /*
         * Keep the public Pet Park presence in sync too.
         * merge:true is safe even if the user has not entered
         * the park yet.
         */
        await setDoc(
          doc(
            db,
            'petParkPresence',
            ownerId
          ),
          {
            petName: cleanName,
          },
          {
            merge: true,
          }
        );

        setPet(
          (previous) => {
            if (!previous) {
              return previous;
            }

            return {
              ...previous,
              name: cleanName,
            };
          }
        );

        setRenameOpen(false);

        setMessage(
          `Your pet is now called ${cleanName}.`
        );
      } catch (error) {
        console.error(
          'Failed to rename pet:',
          error
        );

        setMessage(
          'Could not change your pet nickname. Please try again.'
        );
      } finally {
        setRenaming(false);
      }
    };

  /* =========================================================
     COOLDOWN
  ========================================================= */

  const getRemainingCooldown =
  useCallback(
    (
      action:
        | 'play'
        | 'study'
        | 'sleep'
    ) => {
      if (!pet) {
        return 0;
      }

      let timestamp:
        | Timestamp
        | null
        | undefined;

      if (
        action === 'play'
      ) {
        timestamp =
          pet.lastPlayedAt;
      }

      if (
        action === 'study'
      ) {
        timestamp =
          pet.lastStudyAt;
      }

      if (
        action === 'sleep'
      ) {
        timestamp =
          pet.lastSleptAt;
      }

      const lastTime =
        timestampToMs(
          timestamp
        );

      if (!lastTime) {
        return 0;
      }

      const cooldown =
        ACTIONS[action]
          .cooldown;

      return Math.max(
        0,
        lastTime +
          cooldown -
          now
      );
    },
    [pet, now]
  );

  const feedPet =
  async (
    food: FoodItem
  ) => {
    if (
      !ownerId ||
      !pet ||
      feedingFoodId
    ) {
      return;
    }

    const localQuantity =
      pantry[
        food.id
      ]?.quantity || 0;

    if (
      localQuantity <= 0
    ) {
      setMessage(
        `${food.name} is not in your pantry.`
      );

      return;
    }

    if (
      food.species !==
        'all' &&
      food.species !==
        pet.species
    ) {
      setMessage(
        `${food.name} is not suitable for ${pet.name}.`
      );

      return;
    }

    setFeedingFoodId(
      food.id
    );

    setMessage('');

    try {
      const petRef =
        doc(
          db,
          'pets',
          ownerId
        );

      const foodRef =
        doc(
          db,
          'pets',
          ownerId,
          'pantry',
          food.id
        );

      const result =
        await runTransaction(
          db,
          async (
            transaction
          ) => {
            /*
             * IMPORTANT:
             * All reads happen first.
             */

            const petSnapshot =
              await transaction.get(
                petRef
              );

            const foodSnapshot =
              await transaction.get(
                foodRef
              );

            if (
              !petSnapshot.exists()
            ) {
              throw new Error(
                'Pet not found.'
              );
            }

            if (
              !foodSnapshot.exists()
            ) {
              throw new Error(
                'That food is no longer in your pantry.'
              );
            }

            const currentPet =
              petSnapshot.data() as PetData;

            /*
             * Apply any hunger decay that
             * happened since last update.
             */
            const decayResult =
              applyPassiveNeedDecay(
                currentPet,
                Date.now()
              );

            const basePet =
              decayResult.pet;

            if (
              basePet.hunger >=
              100
            ) {
              throw new Error(
                `${basePet.name} is already full.`
              );
            }

            if (
              food.species !==
                'all' &&
              food.species !==
                basePet.species
            ) {
              throw new Error(
                `${food.name} is not suitable for ${basePet.name}.`
              );
            }

            const pantryFood =
              foodSnapshot.data() as PantryItem;

            const quantity =
              Number(
                pantryFood.quantity ||
                  0
              );

            if (
              quantity <= 0
            ) {
              throw new Error(
                'That food is already gone.'
              );
            }

            const newHunger =
              clamp(
                basePet.hunger +
                  food.hungerGain
              );

            const newHappiness =
              clamp(
                basePet.happiness +
                  food.happinessBonus
              );

            const xpResult =
              applyXp(
                basePet.level,
                basePet.xp,
                ACTIONS.feed.xp
              );

            const levelBonus =
              xpResult.levelsGained *
              25;

            const newCoins =
              basePet.coins +
              ACTIONS.feed.coins +
              levelBonus;

            const currentTime =
              Timestamp.now();

            /*
             * Update pet.
             */
            transaction.update(
              petRef,
              {
                hunger:
                  newHunger,

                happiness:
                  newHappiness,

                energy:
                  basePet.energy,

                level:
                  xpResult.level,

                xp:
                  xpResult.xp,

                coins:
                  newCoins,

                lastFedAt:
                  currentTime,

                lastNeedTickAt:
                  currentTime,

                updatedAt:
                  currentTime,
              }
            );

            /*
             * Remove ONE food.
             */
            if (
              quantity <= 1
            ) {
              transaction.delete(
                foodRef
              );
            } else {
              transaction.update(
                foodRef,
                {
                  quantity:
                    quantity -
                    1,

                  updatedAt:
                    currentTime,
                }
              );
            }

            return {
              pet: {
                ...basePet,

                hunger:
                  newHunger,

                happiness:
                  newHappiness,

                level:
                  xpResult.level,

                xp:
                  xpResult.xp,

                coins:
                  newCoins,

                lastFedAt:
                  currentTime,

                lastNeedTickAt:
                  currentTime,

                updatedAt:
                  currentTime,
              } as PetData,

              remaining:
                quantity - 1,
            };
          }
        );

      /*
       * Update local pet.
       */
      setPet(
        result.pet
      );

      /*
       * A successful feeding counts as today's
       * Tambayan activity. This shares the same
       * users/{ownerId}.streak used elsewhere.
       */
      try {
        const updatedStreak =
          await updateUserStreakFromPetInteraction(
            ownerId
          );

        setCurrentStreak(
          updatedStreak
        );
      } catch (streakError) {
        console.error(
          'Failed to update streak from feeding:',
          streakError
        );
      }

      /*
       * Update local pantry.
       */
      setPantry(
        (previous) => {
          if (
            result.remaining <=
            0
          ) {
            const next = {
              ...previous,
            };

            delete next[
              food.id
            ];

            return next;
          }

          return {
            ...previous,

            [food.id]: {
              ...previous[
                food.id
              ],

              foodId:
                food.id,

              quantity:
                result.remaining,
            },
          };
        }
      );

      /*
       * Eating animation.
       */
      triggerPetAnimation(
        'feed',
        2600,
        getPetDialogue(
          result.pet.species,
          'feed'
        )
      );

      setMessage(
        `${pet.name} ate ${food.name}. +${food.hungerGain} hunger.`
      );

      /*
       * Close feed picker after
       * choosing the food.
       */
      setFeedOpen(false);
    } catch (error) {
      console.error(
        'Feeding failed:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not feed your pet.'
      );
    } finally {
      setFeedingFoodId(
        null
      );
    }
  };

/* =========================================================
   PET ACTION — PLAY / STUDY / SLEEP ONLY
========================================================= */

const performAction =
  async (
    action:
      | 'play'
      | 'study'
      | 'sleep'
  ) => {
    if (
      !ownerId ||
      !pet ||
      actionLoading
    ) {
      return;
    }

    const remaining =
      getRemainingCooldown(
        action
      );

    if (remaining > 0) {
      setMessage(
        `${action} is still on cooldown.`
      );

      return;
    }

    setActionLoading(
      action
    );

    setMessage('');

    try {
      const petRef =
        doc(
          db,
          'pets',
          ownerId
        );

      const updatedPet =
        await runTransaction(
          db,
          async (
            transaction
          ) => {
            const snapshot =
              await transaction.get(
                petRef
              );

            if (
              !snapshot.exists()
            ) {
              throw new Error(
                'Pet not found.'
              );
            }

            const current =
              snapshot.data() as PetData;

            /*
             * Apply passive hunger decay first.
             */
            const decayResult =
              applyPassiveNeedDecay(
                current,
                Date.now()
              );

            const basePet =
              decayResult.pet;

            let hunger =
              basePet.hunger;

            let happiness =
              basePet.happiness;

            let energy =
              basePet.energy;

            /*
             * PLAY
             */
            if (
              action === 'play'
            ) {
              if (
                hunger <= 15
              ) {
                throw new Error(
                  `${basePet.name} is too hungry to play. Feed them first.`
                );
              }

              if (energy <= 0) {
                throw new Error(
                  `${basePet.name} is too exhausted to play. Let them sleep first.`
                );
              }

              happiness =
                clamp(
                  happiness + 20
                );

              energy =
                clamp(
                  energy - 8
                );
            }

            /*
             * STUDY
             */
            if (
              action === 'study'
            ) {
              if (
                hunger <= 15
              ) {
                throw new Error(
                  `${basePet.name} is too hungry to study. Feed them first.`
                );
              }

              if (
                energy < 10
              ) {
                throw new Error(
                  `${basePet.name} needs more energy before studying.`
                );
              }

              energy =
                clamp(
                  energy - 10
                );
            }

            /*
             * SLEEP
             */
            if (
              action === 'sleep'
            ) {
              energy =
                clamp(
                  energy + 35
                );
            }

            const reward =
              ACTIONS[action];

            const xpResult =
              applyXp(
                basePet.level,
                basePet.xp,
                reward.xp
              );

            const levelBonus =
              xpResult.levelsGained *
              25;

            const nextCoins =
              basePet.coins +
              reward.coins +
              levelBonus;

            const currentTime =
              Timestamp.now();

            const updates:
              Partial<PetData> = {
              hunger,

              happiness,

              energy,

              level:
                xpResult.level,

              xp:
                xpResult.xp,

              coins:
                nextCoins,

              lastNeedTickAt:
                decayResult.changed
                  ? Timestamp.fromMillis(
                      decayResult.nextTickMs
                    )
                  : basePet.lastNeedTickAt,

              updatedAt:
                currentTime,
            };

            if (
              action === 'play'
            ) {
              updates.lastPlayedAt =
                currentTime;
            }

            if (
              action === 'study'
            ) {
              updates.lastStudyAt =
                currentTime;
            }

            if (
              action === 'sleep'
            ) {
              updates.lastSleptAt =
                currentTime;
            }

            transaction.update(
              petRef,
              updates
            );

            return {
              ...basePet,
              ...updates,
            } as PetData;
          }
        );

      setPet(
        updatedPet
      );

      /*
       * A successful Play / Study / Sleep action
       * counts as today's Tambayan activity.
       * Only one streak day can be earned per PH day.
       */
      try {
        const updatedStreak =
          await updateUserStreakFromPetInteraction(
            ownerId
          );

        setCurrentStreak(
          updatedStreak
        );
      } catch (streakError) {
        console.error(
          'Failed to update streak from pet action:',
          streakError
        );
      }

      const animationDurations = {
        play: 2800,
        study: 3200,
        sleep: 4200,
      } as const;

      triggerPetAnimation(
        action,
        animationDurations[
          action
        ],
        getPetDialogue(
          updatedPet.species,
          action
        )
      );

      const actionMessages = {
        play:
          `${pet.name} had fun playing.`,

        study:
          `${pet.name} studied with you.`,

        sleep:
          `${pet.name} feels rested.`,
      };

      setMessage(
        actionMessages[
          action
        ]
      );
    } catch (error) {
      console.error(
        'Pet action failed:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong.'
      );
    } finally {
      setActionLoading(
        null
      );
    }
  };

  /* =========================================================
     TAMBAY JOBS — EARN COINS
  ========================================================= */

  const performTambayJob = async (
    job: (typeof TAMBAY_JOBS)[number]
  ) => {
    if (!ownerId || !pet || jobLoading) {
      return;
    }

    const remaining = getJobRemainingCooldown(job);

    if (remaining > 0) {
      setMessage(
        `Take a break first. Next job in ${formatCooldown(remaining)}.`
      );
      return;
    }

    if (jobsCompletedToday >= MAX_JOBS_PER_DAY) {
      setMessage(
        `You already finished ${MAX_JOBS_PER_DAY} jobs today. Come back tomorrow.`
      );
      return;
    }

    setJobLoading(job.id);
    setMessage('');

    try {
      const petRef = doc(db, 'pets', ownerId);

      const updatedPet = await runTransaction(
        db,
        async (transaction) => {
          const snapshot = await transaction.get(petRef);

          if (!snapshot.exists()) {
            throw new Error('Pet not found.');
          }

          const current = snapshot.data() as PetData;
          const today = getPhilippineDate();
          const currentTime = Timestamp.now();

          const previousJob = TAMBAY_JOBS.find(
            (candidate) => candidate.id === current.lastJobId
          );

          if (current.lastJobAt && previousJob) {
            const availableAt =
              timestampToMs(current.lastJobAt) +
              previousJob.cooldown;

            if (Date.now() < availableAt) {
              throw new Error(
                `Take a break first. Next job in ${formatCooldown(availableAt - Date.now())}.`
              );
            }
          }

          const completedToday =
            current.jobDate === today
              ? current.jobsCompletedToday || 0
              : 0;

          if (completedToday >= MAX_JOBS_PER_DAY) {
            throw new Error(
              `You already finished ${MAX_JOBS_PER_DAY} jobs today.`
            );
          }

          const next: Partial<PetData> = {
            coins: current.coins + job.coins,
            lastJobAt: currentTime,
            lastJobId: job.id,
            jobDate: today,
            jobsCompletedToday: completedToday + 1,
            updatedAt: currentTime,
          };

          transaction.update(petRef, next);

          return {
            ...current,
            ...next,
          } as PetData;
        }
      );

      setPet(updatedPet);
      setMessage(
        `${job.name} complete. +${job.coins} Tambay Coins.`
      );
    } catch (error) {
      console.error('Tambay job failed:', error);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not finish this job.'
      );
    } finally {
      setJobLoading(null);
    }
  };

  /* =========================================================
     DAILY REWARD
  ========================================================= */

  const canClaimDaily =
    useMemo(() => {
      if (!pet) {
        return false;
      }

      return (
        pet.lastDailyRewardDate !==
        getPhilippineDate()
      );
    }, [pet]);

  const claimDailyReward =
    async () => {
      if (
        !ownerId ||
        !pet ||
        !canClaimDaily
      ) {
        return;
      }

      setActionLoading(
        'daily'
      );

      try {
        const petRef =
          doc(
            db,
            'pets',
            ownerId
          );

        const result =
          await runTransaction(
            db,
            async (
              transaction
            ) => {
              const snapshot =
                await transaction.get(
                  petRef
                );

              if (
                !snapshot.exists()
              ) {
                throw new Error(
                  'Pet not found.'
                );
              }

              const current =
                snapshot.data() as PetData;

              const today =
                getPhilippineDate();

              if (
                current.lastDailyRewardDate ===
                today
              ) {
                throw new Error(
                  'Daily reward already claimed.'
                );
              }

              let day =
                (
                  current.dailyRewardDay ||
                  0
                ) + 1;

              if (day > 7) {
                day = 1;
              }

              const rewards = [
                20,
                25,
                30,
                35,
                40,
                50,
                100,
              ];

              const reward =
                rewards[
                  day - 1
                ];

              const updated: PetData =
                {
                  ...current,

                  coins:
                    current.coins +
                    reward,

                  lastDailyRewardDate:
                    today,

                  dailyRewardDay:
                    day,
                };

              transaction.update(
                petRef,
                {
                  coins:
                    updated.coins,

                  lastDailyRewardDate:
                    today,

                  dailyRewardDay:
                    day,

                  updatedAt:
                    serverTimestamp(),
                }
              );

              return {
                updated,
                reward,
              };
            }
          );

        setPet(
          result.updated
        );

        setMessage(
          `Daily reward claimed: ${result.reward} Tambay Coins.`
        );
      } catch (error) {
        console.error(
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not claim daily reward.'
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

    /* =========================================================
       PET SHOP
    ========================================================= */

  const buyAccessory =
    async (
      item: AccessoryItem
    ) => {
      if (
        !ownerId ||
        !pet ||
        shopLoading
      ) {
        return;
      }

      if (inventory[item.id]) {
        setMessage(
          'You already own this item.'
        );

        return;
      }

      if (pet.coins < item.price) {
        setMessage(
          `You need ${item.price - pet.coins} more Tambay Coins.`
        );

        return;
      }

      setShopLoading(
        item.id
      );

      setMessage('');

      try {
        const petRef =
          doc(
            db,
            'pets',
            ownerId
          );

        const itemRef =
          doc(
            db,
            'pets',
            ownerId,
            'inventory',
            item.id
          );

        const result =
          await runTransaction(
            db,
            async (
              transaction
            ) => {
              const petSnapshot =
                await transaction.get(
                  petRef
                );

              const itemSnapshot =
                await transaction.get(
                  itemRef
                );

              if (
                !petSnapshot.exists()
              ) {
                throw new Error(
                  'Pet not found.'
                );
              }

              if (
                itemSnapshot.exists()
              ) {
                throw new Error(
                  'You already own this item.'
                );
              }

              const current =
                petSnapshot.data() as PetData;

              if (
                current.coins <
                item.price
              ) {
                throw new Error(
                  'Not enough Tambay Coins.'
                );
              }

              const remainingCoins =
                current.coins -
                item.price;

              transaction.update(
                petRef,
                {
                  coins:
                    remainingCoins,

                  updatedAt:
                    serverTimestamp(),
                }
              );

              transaction.set(
                itemRef,
                {
                  itemId:
                    item.id,

                  acquiredAt:
                    serverTimestamp(),
                }
              );

              return remainingCoins;
            }
          );

        setPet(
          (previous) =>
            previous
              ? {
                  ...previous,
                  coins: result,
                }
              : previous
        );

        setInventory(
          (previous) => ({
            ...previous,

            [item.id]: {
              itemId:
                item.id,
            },
          })
        );

        setMessage(
          `${item.name} added to your inventory.`
        );
      } catch (error) {
        console.error(
          'Failed to buy accessory:',
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not buy this item.'
        );
      } finally {
        setShopLoading(
          null
        );
      }
    };

    const toggleAccessory =
      async (
        item: AccessoryItem
      ) => {
        if (
          !ownerId ||
          !pet ||
          !inventory[item.id] ||
          shopLoading
        ) {
          return;
        }

        const currentEquipped =
          pet.equipped || {
            ...EMPTY_EQUIPPED,
          };

        const isEquipped =
          currentEquipped[
            item.slot
          ] === item.id;

        const nextValue =
          isEquipped
            ? null
            : item.id;

        setShopLoading(
          item.id
        );

        try {
          await updateDoc(
            doc(
              db,
              'pets',
              ownerId
            ),
            {
              [`equipped.${item.slot}`]:
                nextValue,

              updatedAt:
                serverTimestamp(),
            }
          );

          setPet(
            (previous) => {
              if (!previous) {
                return previous;
              }

              return {
                ...previous,

                equipped: {
                  ...previous.equipped,

                  [item.slot]:
                    nextValue,
                },
              };
            }
          );

          setMessage(
            isEquipped
              ? `${item.name} unequipped.`
              : `${item.name} equipped.`
          );
        } catch (error) {
          console.error(
            'Failed to equip item:',
            error
          );

          setMessage(
            'Could not update your outfit.'
          );
        } finally {
          setShopLoading(
            null
          );
        }
      };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="font-mono text-xs text-neutral-500 animate-pulse">
          Loading Tambayan Pet...
        </div>
      </main>
    );
  }

  /* =========================================================
     ADOPTION
  ========================================================= */

  if (!pet || readoptMode) {
    return (
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white px-5 py-10">
        <div className="max-w-3xl mx-auto">

          {readoptMode && pet ? (
            <button
              type="button"
              onClick={() => {
                setReadoptMode(false);
                setPetName('');
                setMessage('');
              }}
              className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-10"
            >
              <Icon.ArrowLeft />
              Back to {pet.name}
            </button>
          ) : (
            <a
              href="/"
              className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-10"
            >
              <Icon.ArrowLeft />
              Back to Tambayan
            </a>
          )}

          <div className="mb-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-600">
              Tambayan Pet
            </p>

            <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">
              {readoptMode
                ? 'Choose your new companion.'
                : 'Pick your companion.'}
            </h1>

            <p className="mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-neutral-500">
              {readoptMode
                ? 'Pick carefully. Confirming a new pet will reset your current Tambayan Pet progress.'
                : 'Adopt a pet, take care of it, earn Tambay Coins, level up, and unlock more as you keep coming back.'}
            </p>
          </div>

          {readoptMode && pet && (
            <div
              className="
                mb-6
                rounded-2xl
                border
                border-rose-200
                bg-rose-50
                p-4
                dark:border-rose-950
                dark:bg-rose-950/20
              "
            >
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-rose-600 dark:text-rose-400">
                Readoption reset
              </p>

              <p className="mt-2 text-sm font-bold">
                {pet.name}&apos;s pet progress will be replaced.
              </p>

              <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                Level, XP, Tambay Coins, needs, personality, wardrobe, pantry, and pet reward progress will reset. Your Tambayan streak will stay.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PETS.map(
              (candidate) => {
                const selected =
                  selectedSpecies ===
                  candidate.id;

                const requiredStreak =
                  candidate.unlockStreak ||
                  0;

                const locked =
                  requiredStreak > 0 &&
                  currentStreak <
                    requiredStreak;

                return (
                  <button
                    key={
                      candidate.id
                    }
                    type="button"
                    disabled={
                      locked ||
                      streakLoading
                    }
                    onClick={() => {
                      if (!locked) {
                        setSelectedSpecies(
                          candidate.id
                        );
                      }
                    }}
                    className={`relative text-left rounded-2xl border p-4 transition-all ${
                      locked
                        ? 'cursor-not-allowed border-pink-200 bg-pink-50/40 opacity-75 dark:border-pink-950 dark:bg-pink-950/10'
                        : selected
                          ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/10'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    {requiredStreak >
                      0 && (
                      <div
                        className={`
                          absolute
                          right-3
                          top-3
                          z-20
                          rounded-full
                          px-2.5
                          py-1
                          font-mono
                          text-[7px]
                          font-black
                          uppercase
                          tracking-wider
                          ${
                            locked
                              ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }
                        `}
                      >
                        {locked
                          ? `${requiredStreak}-day streak`
                          : 'Unlocked'}
                      </div>
                    )}

                    <div
                      className={`
                        relative
                        aspect-square
                        rounded-xl
                        flex
                        items-center
                        justify-center
                        overflow-hidden
                        ${
                          locked
                            ? 'bg-pink-100/60 dark:bg-pink-950/20'
                            : selected
                              ? 'bg-emerald-500/10'
                              : 'bg-neutral-100 dark:bg-neutral-800'
                        }
                      `}
                    >
                      <div
                        className={`scale-[0.62] sm:scale-[0.7] transition ${
                          locked
                            ? 'grayscale-[0.25] opacity-55'
                            : ''
                        }`}
                      >
                        <PetAvatar
                          species={
                            candidate.id
                          }
                        />
                      </div>

                      {locked && (
                        <div
                          className="
                            absolute
                            bottom-3
                            left-1/2
                            -translate-x-1/2
                            whitespace-nowrap
                            rounded-full
                            border
                            border-pink-200
                            bg-white/90
                            px-3
                            py-1.5
                            font-mono
                            text-[7px]
                            font-black
                            uppercase
                            tracking-wider
                            text-pink-700
                            shadow-sm
                            backdrop-blur
                            dark:border-pink-900
                            dark:bg-neutral-900/90
                            dark:text-pink-300
                          "
                        >
                          {currentStreak}/{requiredStreak} days
                        </div>
                      )}
                    </div>

                    <p className="mt-3 font-bold">
                      {candidate.name}
                    </p>

                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                      {
                        candidate.description
                      }
                    </p>
                  </button>
                );
              }
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
            <label className="font-mono text-[10px] uppercase tracking-wider font-bold text-neutral-500">
              Pet name
            </label>

            <input
              value={petName}
              onChange={(event) =>
                setPetName(
                  event.target.value.slice(
                    0,
                    20
                  )
                )
              }
              placeholder="Give your pet a name"
              className="mt-3 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-4 py-3 text-base outline-none focus:border-emerald-500"
            />

            <div className="flex justify-between mt-2 font-mono text-[9px] text-neutral-400">
              <span>
                You can change this later.
              </span>

              <span>
                {petName.length}/20
              </span>
            </div>

            {message && (
              <p className="mt-4 text-xs text-neutral-500">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={
                adoptPet
              }
              disabled={
                creating
              }
              className="mt-5 w-full rounded-xl bg-neutral-900 dark:bg-emerald-600 text-white py-3.5 font-mono text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {creating
                ? readoptMode
                  ? 'Resetting...'
                  : 'Adopting...'
                : readoptMode
                  ? 'Reset & Readopt Pet'
                  : 'Adopt Pet'}
            </button>
          </div>

        </div>
      </main>
    );
  }

  /* =========================================================
     PET HOME
  ========================================================= */

  const xpNeeded =
    getXpNeeded(
      pet.level
    );

  const xpPercent =
    Math.min(
      100,
      (
        pet.xp /
        xpNeeded
      ) *
        100
    );

  const playCooldown =
    getRemainingCooldown(
      'play'
    );

  const studyCooldown =
    getRemainingCooldown(
      'study'
    );

  const sleepCooldown =
    getRemainingCooldown(
      'sleep'
    );

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 px-4 sm:px-6 py-8">

      <div className="max-w-4xl mx-auto">

        {/* HEADER */}

        <div className="flex items-center justify-between gap-4 mb-8">

          <a
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <Icon.ArrowLeft />

            Tambayan
          </a>

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <Icon.Coins />

            <span className="font-mono text-xs font-black">
              {pet.coins}
            </span>

            <span className="hidden sm:inline font-mono text-[9px] uppercase text-neutral-500">
              Tambay Coins
            </span>
          </div>

        </div>

        {!parkOpen && parkIncoming && (
          <div
            className="
              mb-5
              rounded-2xl
              border
              border-emerald-200
              dark:border-emerald-900/50
              bg-emerald-50
              dark:bg-emerald-950/30
              px-4
              py-3
            "
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                  Pet Park
                </p>

                <p className="mt-1 text-sm font-bold">
                  {parkIncoming.type ===
                    'wave' &&
                    `${parkIncoming.fromPetName} waved at ${pet.name}.`}

                  {parkIncoming.type ===
                    'play' &&
                    `${parkIncoming.fromPetName} invited ${pet.name} to play.`}

                  {parkIncoming.type ===
                    'sit' &&
                    `${parkIncoming.fromPetName} sat beside ${pet.name}.`}

                  {parkIncoming.type ===
                    'treat' &&
                    `${parkIncoming.fromPetName} sent ${pet.name} ${parkIncoming.foodName || 'a treat'}.`}

                  {parkIncoming.type ===
                    'chat' &&
                    `${parkIncoming.fromPetName}: ${parkIncoming.messagePreview || 'sent you a message.'}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setParkIncoming(
                    null
                  )
                }
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                aria-label="Dismiss Pet Park notification"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">

          {/* PET */}

          <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">

            <div className="relative min-h-[360px] sm:min-h-[440px] flex flex-col items-center justify-center px-6 py-10">

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.10),transparent_50%)]" />

              <div
                className={`relative flex items-center justify-center w-[230px] h-[210px] transition-all duration-500 ${
                  petCondition?.severity === 'critical'
                    ? 'grayscale-[0.45] opacity-80 scale-[0.97]'
                    : ''
                }`}
              >
                <PetAvatar
                  species={
                    pet.species
                  }
                  equipped={
                    pet.equipped
                  }
                  animation={
                    petAnimation
                  }
                  dialogue={
                    petDialogue ||
                    petCondition?.dialogue ||
                    null
                  }
                />
              </div>

              <div className="relative text-center mt-2">

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <h1 className="text-3xl font-black tracking-tight">
                    {pet.name}
                  </h1>

                  <button
                    type="button"
                    onClick={() => {
                      setRenameValue(
                        pet.name
                      );
                      setRenameOpen(
                        true
                      );
                    }}
                    className="
                      rounded-lg
                      px-2
                      py-1
                      font-mono
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-neutral-400
                      transition-colors
                      hover:bg-neutral-100
                      hover:text-emerald-600
                      dark:hover:bg-neutral-800
                      dark:hover:text-emerald-400
                    "
                  >
                    Edit
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-wider">

                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                    Level {pet.level}
                  </span>

                  <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                    {
                      pet.personality
                    }
                  </span>

                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setParkMessage('');
                      setSelectedParkPet(
                        null
                      );
                      setGiftTarget(
                        null
                      );
                      setParkOpen(
                        true
                      );
                    }}
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-emerald-600
                      px-4
                      py-2.5
                      font-mono
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-white
                      transition
                      hover:bg-emerald-700
                      active:scale-[0.98]
                    "
                  >
                    Enter Pet Park
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setReadoptWarningOpen(
                        true
                      )
                    }
                    className="
                      mt-3
                      block
                      mx-auto
                      font-mono
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-neutral-400
                      transition-colors
                      hover:text-rose-500
                    "
                  >
                    Readopt a pet
                  </button>
                </div>

              </div>

            </div>

            {/* XP */}

            <div className="px-5 sm:px-6 pb-6">

              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                  <Icon.Spark />
                  Experience
                </span>

                <span className="font-mono text-[10px] font-bold">
                  {pet.xp} / {xpNeeded}
                </span>
              </div>

              <div className="h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${xpPercent}%`,
                  }}
                />
              </div>

            </div>

          </section>

          {/* RIGHT */}

          <div className="space-y-5">

            {/* STATS */}

            <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">

              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-5">
                Pet Status
              </p>

              <div className="space-y-5">

                <StatBar
                  label="Hunger"
                  value={
                    pet.hunger
                  }
                  icon={
                    <Icon.Hunger />
                  }
                />

                <StatBar
                  label="Happiness"
                  value={
                    pet.happiness
                  }
                  icon={
                    <Icon.Heart />
                  }
                />

                <StatBar
                  label="Energy"
                  value={
                    pet.energy
                  }
                  icon={
                    <Icon.Energy />
                  }
                />

              </div>

              {petAlert && (
              <div
                className={`mt-5 rounded-xl border px-4 py-3 ${
                  petAlert.severity ===
                  'critical'
                    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300'
                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'
                }`}
              >
                <p className="text-sm font-bold">
                  {petAlert.title}
                </p>

                <p className="mt-1 text-xs leading-relaxed opacity-90">
                  {
                    petAlert.description
                  }
                </p>
              </div>
            )}

            </section>

            {/* DAILY */}

            <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <div className="flex items-center gap-2">
                    <Icon.Gift />

                    <p className="font-bold">
                      Daily Reward
                    </p>
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    Day {
                      pet.dailyRewardDay ||
                      0
                    } of 7
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    !canClaimDaily ||
                    actionLoading ===
                      'daily'
                  }
                  onClick={
                    claimDailyReward
                  }
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-mono text-[10px] font-bold uppercase tracking-wider disabled:opacity-40"
                >
                  {canClaimDaily
                    ? 'Claim'
                    : 'Claimed'}
                </button>

              </div>

            </section>

          </div>

        </div>

        {/* ACTIONS */}

        <section className="mt-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6">

          <div className="flex items-end justify-between gap-4 mb-5">

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                Activities
              </p>

              <h2 className="mt-1 text-xl font-black">
                Spend time together
              </h2>
            </div>

          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            <ActionButton
              label="Feed"
              description={
                availablePantryFoods
                  .length > 0
                  ? `${availablePantryFoods.length} food ${
                      availablePantryFoods.length ===
                      1
                        ? 'type'
                        : 'types'
                    } available`
                  : 'Pantry empty'
              }
              icon={
                <Icon.Food />
              }
              remaining={0}
              loading={
                feedingFoodId !==
                null
              }
              onClick={() =>
                setFeedOpen(true)
              }
            />

            <ActionButton
              label="Play"
              description="+20 happiness"
              icon={
                <Icon.Play />
              }
              remaining={
                playCooldown
              }
              loading={
                actionLoading ===
                'play'
              }
              onClick={() =>
                performAction(
                  'play'
                )
              }
            />

            <ActionButton
              label="Study"
              description="+8 XP"
              icon={
                <Icon.Study />
              }
              remaining={
                studyCooldown
              }
              loading={
                actionLoading ===
                'study'
              }
              onClick={() =>
                performAction(
                  'study'
                )
              }
            />

            <ActionButton
              label="Sleep"
              description="+35 energy"
              icon={
                <Icon.Sleep />
              }
              remaining={
                sleepCooldown
              }
              loading={
                actionLoading ===
                'sleep'
              }
              onClick={() =>
                performAction(
                  'sleep'
                )
              }
            />

          </div>

          {message && (
            <div className="mt-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-3 text-xs text-neutral-500">
              {message}
            </div>
          )}

        </section>

{/* =========================================================
    MANUAL FEED PICKER
========================================================= */}

{feedOpen && (
  <div
    className="
      fixed
      inset-0
      z-[100]
      flex
      items-end
      sm:items-center
      justify-center
      bg-neutral-950/60
      backdrop-blur-sm
      px-0
      sm:px-4
    "
    onClick={() => {
      if (
        !feedingFoodId
      ) {
        setFeedOpen(
          false
        );
      }
    }}
  >
    <div
      onClick={(event) =>
        event.stopPropagation()
      }
      className="
        relative
        w-full
        sm:max-w-lg
        max-h-[85vh]
        overflow-y-auto
        rounded-t-3xl
        sm:rounded-3xl
        border
        border-neutral-200
        dark:border-neutral-800
        bg-white
        dark:bg-neutral-900
        shadow-2xl
      "
    >

      {/* HEADER */}
      <div
        className="
          sticky
          top-0
          z-20
          flex
          items-start
          justify-between
          gap-4
          border-b
          border-neutral-100
          dark:border-neutral-800
          bg-white/95
          dark:bg-neutral-900/95
          backdrop-blur
          p-5
        "
      >
        <div>
          <p
            className="
              font-mono
              text-[9px]
              font-bold
              uppercase
              tracking-[0.18em]
              text-emerald-600
            "
          >
            Pantry
          </p>

          <h2 className="mt-1 text-xl font-black">
            Feed {pet.name}
          </h2>

          <p className="mt-1 text-xs text-neutral-500">
            Choose what you want {pet.name} to eat.
          </p>
        </div>

        <button
          type="button"
          disabled={
            feedingFoodId !==
            null
          }
          onClick={() =>
            setFeedOpen(
              false
            )
          }
          className="
            shrink-0
            w-9
            h-9
            rounded-full
            border
            border-neutral-200
            dark:border-neutral-700
            flex
            items-center
            justify-center
            text-lg
            text-neutral-500
            hover:bg-neutral-100
            dark:hover:bg-neutral-800
            disabled:opacity-40
          "
        >
          ×
        </button>
      </div>

      <div className="p-5">

        {/* HUNGER STATUS */}
        <div
          className="
            rounded-2xl
            border
            border-neutral-200
            dark:border-neutral-800
            bg-neutral-50
            dark:bg-neutral-950
            p-4
          "
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon.Hunger />

              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Hunger
              </span>
            </div>

            <span className="font-mono text-xs font-black">
              {pet.hunger}/100
            </span>
          </div>

          <div
            className="
              mt-3
              h-2.5
              overflow-hidden
              rounded-full
              bg-neutral-200
              dark:bg-neutral-800
            "
          >
            <div
              className="
                h-full
                rounded-full
                bg-emerald-500
                transition-all
                duration-500
              "
              style={{
                width:
                  `${pet.hunger}%`,
              }}
            />
          </div>

          {pet.hunger >=
            100 && (
            <p className="mt-3 text-xs text-emerald-600">
              {pet.name} is already full.
            </p>
          )}
        </div>

        {/* EMPTY */}
        {availablePantryFoods.length ===
        0 ? (
          <div className="py-12 text-center">

            <div
              className="
                mx-auto
                flex
                w-12
                h-12
                items-center
                justify-center
                rounded-2xl
                bg-neutral-100
                dark:bg-neutral-800
                text-neutral-400
              "
            >
              <Icon.Food />
            </div>

            <p className="mt-4 font-bold">
              No food available.
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              Buy food for {pet.name} from the Food Store first.
            </p>

            <button
              type="button"
              onClick={() => {
                setFeedOpen(
                  false
                );

                setFoodTab(
                  'shop'
                );

                window.setTimeout(
                  () => {
                    document
                      .getElementById(
                        'food-store'
                      )
                      ?.scrollIntoView({
                        behavior:
                          'smooth',
                        block:
                          'start',
                      });
                  },
                  100
                );
              }}
              className="
                mt-5
                rounded-xl
                bg-neutral-900
                dark:bg-neutral-100
                px-5
                py-2.5
                font-mono
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-white
                dark:text-neutral-900
              "
            >
              Open Food Store
            </button>

          </div>
        ) : (
          <div className="mt-5 space-y-3">

            {availablePantryFoods.map(
              (food) => {
                const quantity =
                  pantry[
                    food.id
                  ]?.quantity ||
                  0;

                const loading =
                  feedingFoodId ===
                  food.id;

                const isFavorite =
                  food.species ===
                  pet.species;

                const nextHunger =
                  Math.min(
                    100,
                    pet.hunger +
                      food.hungerGain
                  );

                return (
                  <button
                    key={
                      food.id
                    }
                    type="button"
                    disabled={
                      feedingFoodId !==
                        null ||
                      pet.hunger >=
                        100
                    }
                    onClick={() =>
                      feedPet(
                        food
                      )
                    }
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-neutral-200
                      dark:border-neutral-800
                      bg-neutral-50
                      dark:bg-neutral-950
                      p-3
                      text-left
                      transition-all
                      hover:border-emerald-500/50
                      hover:bg-emerald-500/[0.03]
                      active:scale-[0.99]
                      disabled:opacity-50
                    "
                  >
                    <div className="flex gap-3">

                      {/* FOOD ART */}
                      <div className="w-[95px] shrink-0">
                        <FoodPreview
                          item={
                            food
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">

                              <p className="font-bold text-sm">
                                {
                                  food.name
                                }
                              </p>

                              {isFavorite && (
                                <span
                                  className="
                                    rounded-full
                                    bg-emerald-500/10
                                    px-2
                                    py-0.5
                                    font-mono
                                    text-[7px]
                                    font-bold
                                    uppercase
                                    tracking-wider
                                    text-emerald-600
                                  "
                                >
                                  Favorite
                                </span>
                              )}

                            </div>

                            <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
                              {
                                food.description
                              }
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="font-mono text-[8px] uppercase tracking-wider text-neutral-400">
                              Qty
                            </p>

                            <p className="font-black">
                              {
                                quantity
                              }
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className="
                              rounded-lg
                              bg-emerald-500/10
                              px-2
                              py-1
                              font-mono
                              text-[8px]
                              font-bold
                              text-emerald-600
                            "
                          >
                            +{
                              food.hungerGain
                            } Hunger
                          </span>

                          {food.happinessBonus >
                            0 && (
                            <span
                              className="
                                rounded-lg
                                bg-pink-500/10
                                px-2
                                py-1
                                font-mono
                                text-[8px]
                                font-bold
                                text-pink-500
                              "
                            >
                              +{
                                food.happinessBonus
                              } Happiness
                            </span>
                          )}
                        </div>

                        <div
                          className="
                            mt-3
                            flex
                            items-center
                            justify-between
                            border-t
                            border-neutral-200
                            dark:border-neutral-800
                            pt-3
                          "
                        >
                          <span className="font-mono text-[9px] text-neutral-400">
                            {pet.hunger}
                            {' → '}
                            {
                              nextHunger
                            }
                          </span>

                          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                            {loading
                              ? 'Feeding...'
                              : 'Feed'}
                          </span>
                        </div>

                      </div>

                    </div>
                  </button>
                );
              }
            )}

          </div>
        )}

      </div>

    </div>
  </div>
)}

{/* TAMBAY JOBS */}
<section className="mt-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6">
  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
        Tambay Jobs
      </p>
      <h2 className="mt-1 text-lg font-black">Earn Tambay Coins</h2>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
        Do small jobs to earn coins for food and accessories. You can finish up to {MAX_JOBS_PER_DAY} jobs per day.
      </p>
    </div>

    <div className="shrink-0 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-center">
      <p className="font-mono text-[8px] uppercase tracking-wider text-neutral-400">Today</p>
      <p className="text-sm font-black">{jobsCompletedToday}/{MAX_JOBS_PER_DAY}</p>
    </div>
  </div>

  <div className="mt-4 grid gap-3 sm:grid-cols-3">
    {TAMBAY_JOBS.map((job) => {
      const remaining = getJobRemainingCooldown(job);
      const dailyLimitReached = jobsCompletedToday >= MAX_JOBS_PER_DAY;
      const disabled = jobLoading !== null || remaining > 0 || dailyLimitReached;

      return (
        <button
          key={job.id}
          type="button"
          disabled={disabled}
          onClick={() => performTambayJob(job)}
          className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-4 text-left transition hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black">{job.name}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
                {job.description}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 font-mono text-xs font-black text-emerald-600">
              <Icon.Coins />
              +{job.coins}
            </div>
          </div>

          <div className="mt-4 border-t border-neutral-200 dark:border-neutral-800 pt-3 font-mono text-[9px] font-bold uppercase tracking-wider">
            {jobLoading === job.id
              ? 'Working...'
              : dailyLimitReached
                ? 'Daily limit reached'
                : remaining > 0
                  ? `Rest ${formatCooldown(remaining)}`
                  : 'Start job'}
          </div>
        </button>
      );
    })}
  </div>

  {petCondition?.severity === 'critical' && (
    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
      Out of coins? Jobs stay available even when your pet needs care, so you can always earn enough for emergency food.
    </p>
  )}
</section>

<section
  id="food-store"
  className="
    mt-5
    rounded-2xl
    border
    border-neutral-200
    dark:border-neutral-800
    bg-white
    dark:bg-neutral-900
    overflow-hidden
  "
>

  {/* HEADER */}
  <div
    className="
      flex
      flex-col
      sm:flex-row
      sm:items-center
      justify-between
      gap-4
      p-5
      sm:p-6
      border-b
      border-neutral-100
      dark:border-neutral-800
    "
  >
    <div>
      <p
        className="
          font-mono
          text-[10px]
          font-bold
          uppercase
          tracking-[0.18em]
          text-emerald-600
        "
      >
        Food Store
      </p>

      <h2 className="mt-1 text-xl font-black">
        Buy food for {pet.name}
      </h2>

      <p className="mt-1 text-xs text-neutral-500">
        Buy food, keep it in your pantry, and choose what to feed your pet.
      </p>
    </div>

    <div
      className="
        flex
        p-1
        rounded-xl
        bg-neutral-100
        dark:bg-neutral-800
      "
    >
      <button
        type="button"
        onClick={() =>
          setFoodTab(
            'shop'
          )
        }
        className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
          foodTab === 'shop'
            ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
            : 'text-neutral-500'
        }`}
      >
        Store
      </button>

      <button
        type="button"
        onClick={() =>
          setFoodTab(
            'pantry'
          )
        }
        className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
          foodTab ===
          'pantry'
            ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
            : 'text-neutral-500'
        }`}
      >
        Pantry
      </button>
    </div>
  </div>

  {/* SHOP */}
  {foodTab === 'shop' && (
    <div
      className="
        grid
        grid-cols-2
        sm:grid-cols-3
        lg:grid-cols-4
        gap-3
        p-4
        sm:p-6
      "
    >
      {FOODS.filter(
        (food) =>
          food.species ===
            pet.species ||
          food.species ===
            'all'
      ).map((food) => {
        const ownedQty =
          pantry[
            food.id
          ]?.quantity || 0;

        const loading =
          foodLoading ===
          food.id;

        return (
          <div
            key={
              food.id
            }
            className="
              rounded-2xl
              border
              border-neutral-200
              dark:border-neutral-800
              bg-neutral-50
              dark:bg-neutral-950
              p-3
            "
          >
            <FoodPreview
              item={food}
            />

            <div className="mt-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm leading-tight">
                  {food.name}
                </p>

                <span
                  className={`shrink-0 rounded-full px-2 py-1 font-mono text-[8px] uppercase tracking-wider ${
                    food.species ===
                    pet.species
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {getFoodMatchLabel(
                    pet.species,
                    food
                  )}
                </span>
              </div>

              <p className="mt-1 min-h-[32px] text-[10px] leading-relaxed text-neutral-500">
                {
                  food.description
                }
              </p>

              <div className="mt-3 space-y-1 text-[10px] text-neutral-500">
                <p>
                  +{
                    food.hungerGain
                  } hunger
                </p>

                {food.happinessBonus >
                  0 && (
                  <p>
                    +{
                      food.happinessBonus
                    } happiness
                  </p>
                )}

                <p>
                  Owned:{' '}
                  <span className="font-bold text-neutral-700 dark:text-neutral-200">
                    {ownedQty}
                  </span>
                </p>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <Icon.Coins />

                <span className="font-mono text-xs font-black">
                  {
                    food.price
                  }
                </span>
              </div>

              <button
                type="button"
                disabled={
                  loading ||
                  pet.coins <
                    food.price
                }
                onClick={() =>
                  buyFood(
                    food
                  )
                }
                className="
                  mt-3
                  w-full
                  rounded-xl
                  bg-neutral-900
                  dark:bg-neutral-100
                  text-white
                  dark:text-neutral-900
                  px-2
                  py-2.5
                  font-mono
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-wider
                  disabled:opacity-35
                "
              >
                {loading
                  ? 'Buying...'
                  : pet.coins <
                      food.price
                    ? 'Not Enough'
                    : 'Buy'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  )}

  {/* PANTRY */}
  {foodTab === 'pantry' && (
    <div className="p-4 sm:p-6">
      {FOODS.filter(
        (food) =>
          (pantry[
            food.id
          ]?.quantity || 0) > 0
      ).length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-bold">
            Your pantry is empty.
          </p>

          <p className="mt-2 text-xs text-neutral-500">
            Buy food so {pet.name} can eat.
          </p>

          <button
            type="button"
            onClick={() =>
              setFoodTab(
                'shop'
              )
            }
            className="
              mt-5
              px-5
              py-2.5
              rounded-xl
              bg-neutral-900
              dark:bg-neutral-100
              text-white
              dark:text-neutral-900
              font-mono
              text-[10px]
              font-bold
              uppercase
              tracking-wider
            "
          >
            Open Store
          </button>
        </div>
      ) : (
        <div
          className="
            grid
            grid-cols-2
            sm:grid-cols-3
            lg:grid-cols-4
            gap-3
          "
        >
          {FOODS.filter(
            (food) =>
              (pantry[
                food.id
              ]?.quantity ||
                0) > 0
          ).map((food) => (
            <div
              key={
                food.id
              }
              className="
                rounded-2xl
                border
                border-neutral-200
                dark:border-neutral-800
                bg-neutral-50
                dark:bg-neutral-950
                p-3
              "
            >
              <FoodPreview
                item={food}
              />

              <p className="mt-3 font-bold text-sm">
                {
                  food.name
                }
              </p>

              <p className="mt-1 text-[10px] text-neutral-500">
                {
                  food.description
                }
              </p>

              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                Quantity
              </p>

              <p className="mt-1 text-lg font-black">
                {
                  pantry[
                    food.id
                  ]?.quantity
                }
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )}
</section>

{/* =========================================================
    SHOP + INVENTORY
========================================================= */}

{/* READOPT WARNING MODAL */}
{readoptWarningOpen && pet && (
  <div
    className="
      fixed
      inset-0
      z-[360]
      flex
      items-end
      sm:items-center
      justify-center
      bg-neutral-950/65
      backdrop-blur-sm
      px-0
      sm:px-4
    "
    onClick={() =>
      setReadoptWarningOpen(
        false
      )
    }
  >
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="readopt-warning-title"
      onClick={(event) =>
        event.stopPropagation()
      }
      className="
        w-full
        sm:max-w-md
        rounded-t-3xl
        sm:rounded-3xl
        border
        border-neutral-200
        dark:border-neutral-800
        bg-white
        dark:bg-neutral-900
        p-5
        sm:p-6
        shadow-2xl
        pb-[max(1.25rem,env(safe-area-inset-bottom))]
      "
    >
      <div
        className="
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-full
          bg-rose-100
          text-lg
          dark:bg-rose-950/50
        "
      >
        !
      </div>

      <h2
        id="readopt-warning-title"
        className="mt-4 text-xl font-black tracking-tight"
      >
        Readopt a new pet?
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        You can choose another companion, but your current Tambayan Pet progress will be reset when you confirm the new adoption.
      </p>

      <div
        className="
          mt-4
          rounded-2xl
          border
          border-rose-200
          bg-rose-50
          p-4
          dark:border-rose-950
          dark:bg-rose-950/20
        "
      >
        <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
          This will reset:
        </p>

        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          {pet.name}&apos;s level, XP, Tambay Coins, hunger, happiness, energy, personality, wardrobe, pantry, and pet reward progress.
        </p>

        <p className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          Your Tambayan streak will NOT reset.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            setReadoptWarningOpen(
              false
            )
          }
          className="
            rounded-xl
            border
            border-neutral-200
            dark:border-neutral-700
            px-4
            py-3
            font-mono
            text-[9px]
            font-bold
            uppercase
            tracking-wider
            text-neutral-600
            dark:text-neutral-300
          "
        >
          Keep my pet
        </button>

        <button
          type="button"
          onClick={() => {
            setReadoptWarningOpen(
              false
            );

            setSelectedSpecies(
              pet.species
            );

            setPetName('');
            setMessage('');
            setReadoptMode(true);
          }}
          className="
            rounded-xl
            bg-rose-600
            px-4
            py-3
            font-mono
            text-[9px]
            font-bold
            uppercase
            tracking-wider
            text-white
            transition
            hover:bg-rose-500
            active:scale-[0.99]
          "
        >
          Choose new pet
        </button>
      </div>
    </div>
  </div>
)}

{/* RENAME PET MODAL */}
{renameOpen && (
  <div
    className="
      fixed
      inset-0
      z-[350]
      flex
      items-end
      sm:items-center
      justify-center
      bg-neutral-950/60
      backdrop-blur-sm
      px-0
      sm:px-4
    "
    onClick={() => {
      if (!renaming) {
        setRenameOpen(false);
      }
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-pet-title"
      onClick={(event) =>
        event.stopPropagation()
      }
      className="
        w-full
        sm:max-w-sm
        rounded-t-3xl
        sm:rounded-3xl
        border
        border-neutral-200
        dark:border-neutral-800
        bg-white
        dark:bg-neutral-900
        p-5
        sm:p-6
        shadow-2xl
        pb-[max(1.25rem,env(safe-area-inset-bottom))]
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600">
            Tambayan Pet
          </p>

          <h2
            id="rename-pet-title"
            className="mt-1 text-xl font-black"
          >
            Change nickname
          </h2>

          <p className="mt-1 text-xs text-neutral-500">
            Give your pet a new name.
          </p>
        </div>

        <button
          type="button"
          disabled={renaming}
          onClick={() =>
            setRenameOpen(false)
          }
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-neutral-100
            text-lg
            text-neutral-500
            hover:text-neutral-900
            disabled:opacity-50
            dark:bg-neutral-800
            dark:hover:text-white
          "
          aria-label="Close nickname editor"
        >
          ×
        </button>
      </div>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          renamePet();
        }}
      >
        <label
          htmlFor="pet-nickname"
          className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-500"
        >
          Pet nickname
        </label>

        <input
          id="pet-nickname"
          type="text"
          value={renameValue}
          maxLength={20}
          autoFocus
          disabled={renaming}
          onChange={(event) =>
            setRenameValue(
              event.target.value
            )
          }
          className="
            mt-2
            w-full
            rounded-xl
            border
            border-neutral-200
            bg-neutral-50
            px-4
            py-3
            text-base
            font-bold
            outline-none
            transition
            focus:border-emerald-500
            focus:ring-2
            focus:ring-emerald-500/10
            disabled:opacity-60
            dark:border-neutral-700
            dark:bg-neutral-950
          "
          placeholder="Pet nickname"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[10px] text-neutral-400">
            2–20 characters
          </p>

          <p className="font-mono text-[9px] text-neutral-400">
            {renameValue.trim().length}/20
          </p>
        </div>

        <button
          type="submit"
          disabled={
            renaming ||
            renameValue.trim().length < 2 ||
            renameValue.trim().length > 20 ||
            renameValue.trim() === pet.name
          }
          className="
            mt-5
            w-full
            rounded-xl
            bg-emerald-600
            px-4
            py-3
            font-mono
            text-[10px]
            font-bold
            uppercase
            tracking-wider
            text-white
            transition
            hover:bg-emerald-500
            active:scale-[0.99]
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          {renaming
            ? 'Saving...'
            : 'Save nickname'}
        </button>
      </form>
    </div>
  </div>
)}

<section
  className="
    mt-5
    rounded-2xl
    border
    border-neutral-200
    dark:border-neutral-800
    bg-white
    dark:bg-neutral-900
    overflow-hidden
  "
>

  {/* HEADER */}
  <div
    className="
      flex
      flex-col
      sm:flex-row
      sm:items-center
      justify-between
      gap-4
      p-5
      sm:p-6
      border-b
      border-neutral-100
      dark:border-neutral-800
    "
  >

    <div>
      <p
        className="
          font-mono
          text-[10px]
          font-bold
          uppercase
          tracking-[0.18em]
          text-emerald-600
        "
      >
        Wardrobe
      </p>

      <h2 className="mt-1 text-xl font-black">
        Customize {pet.name}
      </h2>
    </div>

    <div
      className="
        flex
        p-1
        rounded-xl
        bg-neutral-100
        dark:bg-neutral-800
      "
    >

      <button
        type="button"
        onClick={() =>
          setWardrobeTab(
            'shop'
          )
        }
        className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
          wardrobeTab ===
          'shop'
            ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
            : 'text-neutral-500'
        }`}
      >
        Shop
      </button>

      <button
        type="button"
        onClick={() =>
          setWardrobeTab(
            'inventory'
          )
        }
        className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
          wardrobeTab ===
          'inventory'
            ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
            : 'text-neutral-500'
        }`}
      >
        Inventory
      </button>

    </div>

  </div>

  {/* SHOP */}
  {wardrobeTab === 'shop' && (
    <div
      className="
        grid
        grid-cols-2
        sm:grid-cols-3
        lg:grid-cols-4
        gap-3
        p-4
        sm:p-6
      "
    >

      {ACCESSORIES.map(
        (item) => {
          const owned =
            Boolean(
              inventory[
                item.id
              ]
            );

          const equipped =
            pet.equipped?.[
              item.slot
            ] === item.id;

          const loading =
            shopLoading ===
            item.id;

          return (
            <div
              key={
                item.id
              }
              className="
                min-w-0
                rounded-2xl
                border
                border-neutral-200
                dark:border-neutral-800
                bg-neutral-50
                dark:bg-neutral-950
                p-3
              "
            >

              {/* ITEM PREVIEW */}
              <AccessoryPreview
                itemId={
                  item.id
                }
              />

              <div className="mt-3">

                <div className="flex items-start justify-between gap-2">

                  <p className="font-bold text-sm leading-tight">
                    {
                      item.name
                    }
                  </p>

                  <span
                    className="
                      shrink-0
                      font-mono
                      text-[8px]
                      uppercase
                      tracking-wider
                      text-neutral-400
                    "
                  >
                    {
                      item.rarity
                    }
                  </span>

                </div>

                <p className="mt-1 min-h-[32px] text-[10px] leading-relaxed text-neutral-500">
                  {
                    item.description
                  }
                </p>

                <div className="mt-3 flex items-center gap-1.5">
                  <Icon.Coins />

                  <span className="font-mono text-xs font-black">
                    {
                      item.price
                    }
                  </span>
                </div>

                {owned ? (
                  <button
                    type="button"
                    disabled={
                      loading
                    }
                    onClick={() =>
                      toggleAccessory(
                        item
                      )
                    }
                    className={`mt-3 w-full rounded-xl border px-2 py-2.5 font-mono text-[9px] font-bold uppercase tracking-wider transition-all ${
                      equipped
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900'
                    }`}
                  >
                    {loading
                      ? 'Saving...'
                      : equipped
                        ? 'Unequip'
                        : 'Equip'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      loading ||
                      pet.coins <
                        item.price
                    }
                    onClick={() =>
                      buyAccessory(
                        item
                      )
                    }
                    className="
                      mt-3
                      w-full
                      rounded-xl
                      bg-neutral-900
                      dark:bg-neutral-100
                      text-white
                      dark:text-neutral-900
                      px-2
                      py-2.5
                      font-mono
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-wider
                      disabled:opacity-35
                    "
                  >
                    {loading
                      ? 'Buying...'
                      : pet.coins <
                          item.price
                        ? 'Not Enough'
                        : 'Buy'}
                  </button>
                )}

              </div>
            </div>
          );
        }
      )}

    </div>
  )}

  {/* INVENTORY */}
  {wardrobeTab ===
    'inventory' && (
    <div className="p-4 sm:p-6">

      {Object.keys(
        inventory
      ).length === 0 ? (
        <div className="py-12 text-center">

          <p className="font-bold">
            Your inventory is empty.
          </p>

          <p className="mt-2 text-xs text-neutral-500">
            Buy something from the shop for {pet.name}.
          </p>

          <button
            type="button"
            onClick={() =>
              setWardrobeTab(
                'shop'
              )
            }
            className="
              mt-5
              px-5
              py-2.5
              rounded-xl
              bg-neutral-900
              dark:bg-neutral-100
              text-white
              dark:text-neutral-900
              font-mono
              text-[10px]
              font-bold
              uppercase
              tracking-wider
            "
          >
            Open Shop
          </button>

        </div>
      ) : (
        <div
          className="
            grid
            grid-cols-2
            sm:grid-cols-3
            lg:grid-cols-4
            gap-3
          "
        >

          {ACCESSORIES
            .filter(
              (item) =>
                inventory[
                  item.id
                ]
            )
            .map(
              (item) => {
                const equipped =
                  pet.equipped?.[
                    item.slot
                  ] === item.id;

                return (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    disabled={
                      shopLoading ===
                      item.id
                    }
                    onClick={() =>
                      toggleAccessory(
                        item
                      )
                    }
                    className={`text-left rounded-2xl border p-3 transition-all ${
                      equipped
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950'
                    }`}
                  >

                    <AccessoryPreview
                      itemId={
                        item.id
                      }
                    />

                    <p className="mt-3 font-bold text-sm">
                      {
                        item.name
                      }
                    </p>

                    <p
                      className={`mt-1 font-mono text-[9px] uppercase tracking-wider ${
                        equipped
                          ? 'text-emerald-600'
                          : 'text-neutral-400'
                      }`}
                    >
                      {equipped
                        ? 'Equipped'
                        : `Equip ${item.slot}`}
                    </p>

                  </button>
                );
              }
            )}

        </div>
      )}

    </div>
  )}

</section>

{/* =========================================================
    TAMBAYAN PET PARK
========================================================= */}

{parkOpen && ownerId && (
  <div
    className="
      fixed
      inset-0
      z-[120]
      overscroll-none
      touch-manipulation
      bg-neutral-950/75
      backdrop-blur-sm
      sm:p-3
    "
  >
    <div
      className="
        relative
        mx-auto
        flex
        h-[100dvh]
        max-h-[100dvh]
        w-full
        max-w-7xl
        flex-col
        overflow-hidden
        bg-white
        dark:bg-neutral-950
        sm:h-[calc(100dvh-1.5rem)]
        sm:rounded-3xl
        sm:border
        sm:border-neutral-200
        sm:dark:border-neutral-800
        shadow-2xl
      "
    >

      {/* HEADER */}
      <div
        className="
          relative
          z-[160]
          flex
          shrink-0
          items-center
          justify-between
          gap-3
          border-b
          border-neutral-200
          bg-white/95
          px-3
          pb-3
          backdrop-blur
          dark:border-neutral-800
          dark:bg-neutral-950/95
          sm:px-5
          sm:py-3.5
        "
        style={{
          paddingTop:
            'max(12px, env(safe-area-inset-top))',
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-mono text-[8px] font-black uppercase tracking-[0.16em] text-emerald-600 sm:text-[9px] sm:tracking-[0.18em]">
              Tambayan Pet Park
            </p>

            <span
              className="
                inline-flex
                shrink-0
                items-center
                gap-1.5
                rounded-full
                bg-emerald-500/10
                px-2
                py-1
                font-mono
                text-[7px]
                font-bold
                uppercase
                tracking-wider
                text-emerald-700
                dark:text-emerald-300
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <p className="mt-1 truncate text-[10px] text-neutral-500 sm:text-xs">
            {activeParkPets.length ===
            0
              ? `${pet.name} has the park for now.`
              : `${activeParkPets.length} other pet${activeParkPets.length === 1 ? '' : 's'} wandering around.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setParkOpen(false);
            setSelectedParkPet(null);
            setGiftTarget(null);
            setParkSceneEvent(null);
            setParkPanelTab('actions');
            setParkChatMessages([]);
            setParkChatText('');
          }}
          className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-full
            border
            border-neutral-200
            bg-white
            text-lg
            text-neutral-500
            transition
            active:scale-95
            dark:border-neutral-700
            dark:bg-neutral-900
            sm:h-10
            sm:w-10
            sm:text-xl
          "
          aria-label="Close Pet Park"
        >
          ×
        </button>
      </div>

      {/* PARK NOTIFICATION - ALWAYS ABOVE PARK UI */}
      {parkIncoming && (
        <div
          className="
            absolute
            left-1/2
            top-[68px]
            z-[240]
            w-[calc(100%-24px)]
            max-w-[430px]
            -translate-x-1/2
            sm:top-[76px]
          "
        >
          <div
            className="
              rounded-2xl
              border
              border-emerald-200
              bg-white/95
              px-3.5
              py-3
              shadow-xl
              backdrop-blur
              dark:border-emerald-900/60
              dark:bg-neutral-900/95
              sm:px-4
            "
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Icon.Spark />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[7px] font-black uppercase tracking-[0.16em] text-emerald-600 sm:text-[8px]">
                  {parkIncoming.type ===
                  'chat'
                    ? 'New park message'
                    : 'Pet Park Notification'}
                </p>

                <p className="mt-1 line-clamp-2 text-xs font-bold leading-snug sm:text-sm">
                  {parkIncoming.type ===
                    'wave' &&
                    `${parkIncoming.fromPetName} waved at ${pet.name}.`}

                  {parkIncoming.type ===
                    'play' &&
                    `${parkIncoming.fromPetName} invited ${pet.name} to play.`}

                  {parkIncoming.type ===
                    'sit' &&
                    `${parkIncoming.fromPetName} sat beside ${pet.name}.`}

                  {parkIncoming.type ===
                    'treat' &&
                    `${parkIncoming.fromPetName} sent ${pet.name} ${parkIncoming.foodName || 'a treat'}.`}

                  {parkIncoming.type ===
                    'chat' &&
                    `${parkIncoming.fromPetName}: ${parkIncoming.messagePreview || 'sent you a message.'}`}
                </p>

                {parkIncoming.type ===
                  'chat' && (
                    <button
                      type="button"
                      onClick={() => {
                        setParkPanelTab(
                          'chat'
                        );

                        setParkIncoming(
                          null
                        );
                      }}
                      className="mt-2 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-mono text-[7px] font-black uppercase tracking-wider text-white active:scale-[0.98]"
                    >
                      Open park chat
                    </button>
                  )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setParkIncoming(
                    null
                  )
                }
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL PARK CHAT NOTIFICATION */}
      {parkChatNotice && (
        <div
          className="
            absolute
            left-1/2
            top-[68px]
            z-[235]
            w-[calc(100%-24px)]
            max-w-[430px]
            -translate-x-1/2
            sm:top-[76px]
          "
        >
          <button
            type="button"
            onClick={() => {
              setParkPanelTab(
                'chat'
              );

              setParkChatNotice(
                null
              );

              setParkChatUnreadCount(
                0
              );
            }}
            className="
              flex
              w-full
              items-start
              gap-3
              rounded-2xl
              border
              border-sky-200
              bg-white/95
              px-3.5
              py-3
              text-left
              shadow-xl
              backdrop-blur
              active:scale-[0.99]
              dark:border-sky-900/60
              dark:bg-neutral-900/95
              sm:px-4
            "
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
              <Icon.Spark />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[7px] font-black uppercase tracking-[0.16em] text-sky-600 sm:text-[8px]">
                New Park Chat
              </p>

              <p className="mt-1 truncate text-xs font-black sm:text-sm">
                {parkChatNotice.petName}
              </p>

              <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-neutral-500 sm:text-xs">
                {parkChatNotice.text}
              </p>
            </div>

            <span className="shrink-0 pt-1 font-mono text-[7px] font-black uppercase tracking-wider text-sky-600">
              Open
            </span>
          </button>
        </div>
      )}

      {/* MOBILE-FIRST CONTENT */}
      <div
        className={`
          grid
          min-h-0
          flex-1
          ${
            parkPanelTab ===
            'chat'
              ? 'grid-rows-[minmax(120px,30dvh)_minmax(0,1fr)]'
              : 'grid-rows-[minmax(0,1fr)_minmax(230px,42dvh)]'
          }
          lg:grid-cols-[minmax(0,1fr)_360px]
          lg:grid-rows-1
        `}
      >

        {/* REAL PARK SCENE */}
        <div
          className="
            relative
            min-h-0
            overflow-hidden
          "
        >
          <PetParkScene
            ownerId={ownerId}
            pet={pet}
            pets={activeParkPets}
            selectedPetId={
              selectedParkPet
                ?.ownerId ||
              null
            }
            onSelect={(parkPet) => {
              setSelectedParkPet(
                parkPet
              );
              setGiftTarget(null);
              setParkMessage('');
              setParkPanelTab(
                'actions'
              );
            }}
            sceneEvent={
              parkSceneEvent
            }
            currentAnimation={
              petAnimation
            }
          />

          {/* ACTION RESULT TOAST */}
          {parkMessage && (
            <div
              className="
                absolute
                bottom-3
                left-1/2
                z-[180]
                w-[calc(100%-24px)]
                max-w-[420px]
                -translate-x-1/2
                rounded-2xl
                border
                border-white/70
                bg-white/90
                px-3.5
                py-2.5
                text-center
                text-[10px]
                font-semibold
                shadow-lg
                backdrop-blur
                dark:border-neutral-700
                dark:bg-neutral-900/90
                sm:bottom-4
                sm:text-xs
              "
            >
              {parkMessage}
            </div>
          )}
        </div>

        {/* MOBILE BOTTOM PANEL / DESKTOP SIDE PANEL */}
        <aside
          className="
            relative
            z-[190]
            flex
            h-full
            min-h-0
            flex-col
            overflow-hidden
            border-t
            border-neutral-200
            bg-white
            shadow-[0_-10px_28px_rgba(0,0,0,0.10)]
            dark:border-neutral-800
            dark:bg-neutral-950
            lg:border-l
            lg:border-t-0
            lg:shadow-none
          "
          style={{
            paddingBottom:
              'env(safe-area-inset-bottom)',
          }}
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800 lg:hidden" />

          {/* ALWAYS VISIBLE TABS */}
          <div className="grid shrink-0 grid-cols-2 border-b border-neutral-200 px-3 dark:border-neutral-800 sm:px-4">
            <button
              type="button"
              onClick={() =>
                setParkPanelTab(
                  'actions'
                )
              }
              className={`
                relative
                min-h-[44px]
                px-3
                py-2.5
                font-mono
                text-[9px]
                font-black
                uppercase
                tracking-wider
                transition
                touch-manipulation
                ${
                  parkPanelTab ===
                  'actions'
                    ? 'text-emerald-600'
                    : 'text-neutral-400'
                }
              `}
            >
              Interact

              {parkPanelTab ===
                'actions' && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setParkPanelTab(
                  'chat'
                );

                setParkChatUnreadCount(
                  0
                );

                setParkChatNotice(
                  null
                );
              }}
              className={`
                relative
                min-h-[44px]
                px-3
                py-2.5
                font-mono
                text-[9px]
                font-black
                uppercase
                tracking-wider
                transition
                touch-manipulation
                ${
                  parkPanelTab ===
                  'chat'
                    ? 'text-emerald-600'
                    : 'text-neutral-400'
                }
              `}
            >
              <span className="inline-flex items-center gap-1.5">
                Park Chat

                {parkChatUnreadCount >
                  0 && (
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[7px] leading-none text-white">
                    {Math.min(
                      parkChatUnreadCount,
                      99
                    )}
                  </span>
                )}
              </span>

              {parkPanelTab ===
                'chat' && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          {/* INTERACTIONS */}
          {parkPanelTab ===
            'actions' && (
            <div className="flex min-h-0 flex-1 flex-col">
              {!selectedParkPet ? (
                <div className="pet-park-scroll flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain px-4 py-4 text-center sm:px-5 lg:justify-start lg:pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <Icon.Heart />
                  </div>

                  <p className="mt-2.5 text-sm font-black">
                    Pick another pet
                  </p>

                  <p className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-neutral-500">
                    Tap any wandering pet in the park, then choose how your pets interact.
                  </p>

                  {activeParkPets.length >
                    0 ? (
                    <div className="mt-3 flex w-full max-w-full gap-2 overflow-x-auto pb-1">
                      {activeParkPets
                        .slice(0, 10)
                        .map(
                          (
                            parkPet
                          ) => (
                            <button
                              key={
                                parkPet.ownerId
                              }
                              type="button"
                              onClick={() => {
                                setSelectedParkPet(
                                  parkPet
                                );

                                setGiftTarget(
                                  null
                                );

                                setParkMessage(
                                  ''
                                );
                              }}
                              className="min-h-[40px] shrink-0 rounded-full border border-neutral-200 px-3 py-2 text-[10px] font-bold transition active:scale-95 touch-manipulation dark:border-neutral-800"
                            >
                              {
                                parkPet.petName
                              }
                            </button>
                          )
                        )}
                    </div>
                  ) : (
                    <p className="mt-3 text-[10px] text-neutral-400">
                      No other pets are in the park yet.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setParkPanelTab(
                        'chat'
                      )
                    }
                    className="mt-3 min-h-[42px] rounded-xl bg-neutral-100 px-4 py-2.5 text-[10px] font-bold text-neutral-700 active:scale-[0.98] dark:bg-neutral-900 dark:text-neutral-200"
                  >
                    Open the park-wide chat
                  </button>
                </div>
              ) : (
                <>
                  {/* SELECTED PET */}
                  <div className="flex shrink-0 items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 dark:border-neutral-900 sm:px-5 lg:py-4">
                    <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 sm:h-[58px] sm:w-[58px]">
                      <div className="scale-[0.25] sm:scale-[0.29]">
                        <PetAvatar
                          species={
                            selectedParkPet.species
                          }
                          equipped={
                            selectedParkPet.equipped
                          }
                          animation={
                            parkSceneEvent?.otherOwnerId ===
                              selectedParkPet.ownerId &&
                            parkSceneEvent.type ===
                              'play'
                              ? 'play'
                              : 'idle'
                          }
                        />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[7px] font-black uppercase tracking-[0.16em] text-emerald-600">
                        Park Friend
                      </p>

                      <h3 className="mt-0.5 truncate text-[15px] font-black sm:text-base">
                        {
                          selectedParkPet.petName
                        }
                      </h3>

                      <p className="mt-0.5 truncate text-[9px] text-neutral-500">
                        {
                          selectedParkPet.species
                        }{' '}
                        · Lv.{' '}
                        {
                          selectedParkPet.level
                        }{' '}
                        ·{' '}
                        {
                          selectedParkPet.personality
                        }
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedParkPet(
                          null
                        );

                        setGiftTarget(
                          null
                        );

                        setParkMessage(
                          ''
                        );
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 active:scale-95 dark:border-neutral-800"
                      aria-label="Close selected pet"
                    >
                      ×
                    </button>
                  </div>

                  <div className="pet-park-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-4 pt-3 sm:px-5">
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                      <button
                        type="button"
                        disabled={
                          parkLoading !==
                          null
                        }
                        onClick={() =>
                          sendParkInteraction(
                            selectedParkPet,
                            'wave'
                          )
                        }
                        className="min-h-[64px] rounded-xl border border-neutral-200 px-3 py-2.5 text-left transition active:scale-[0.98] disabled:opacity-40 touch-manipulation dark:border-neutral-800 lg:min-h-[76px]"
                      >
                        <p className="text-[11px] font-black">
                          Wave
                        </p>
                        <p className="mt-0.5 text-[9px] leading-relaxed text-neutral-500">
                          Walk closer and say hi.
                        </p>
                      </button>

                      <button
                        type="button"
                        disabled={
                          parkLoading !==
                          null
                        }
                        onClick={() =>
                          sendParkInteraction(
                            selectedParkPet,
                            'play'
                          )
                        }
                        className="min-h-[64px] rounded-xl border border-neutral-200 px-3 py-2.5 text-left transition active:scale-[0.98] disabled:opacity-40 touch-manipulation dark:border-neutral-800 lg:min-h-[76px]"
                      >
                        <p className="text-[11px] font-black">
                          Play
                        </p>
                        <p className="mt-0.5 text-[9px] leading-relaxed text-neutral-500">
                          Meet by the play area.
                        </p>
                      </button>

                      <button
                        type="button"
                        disabled={
                          parkLoading !==
                          null
                        }
                        onClick={() =>
                          sendParkInteraction(
                            selectedParkPet,
                            'sit'
                          )
                        }
                        className="min-h-[64px] rounded-xl border border-neutral-200 px-3 py-2.5 text-left transition active:scale-[0.98] disabled:opacity-40 touch-manipulation dark:border-neutral-800 lg:min-h-[76px]"
                      >
                        <p className="text-[11px] font-black">
                          Sit Together
                        </p>
                        <p className="mt-0.5 text-[9px] leading-relaxed text-neutral-500">
                          Hang out by the bench.
                        </p>
                      </button>

                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => {
                          setGiftTarget(
                            selectedParkPet
                          );
                          setParkMessage('');
                        }}
                        className="
                          relative
                          min-h-[64px]
                          overflow-hidden
                          rounded-xl
                          border
                          border-emerald-400/50
                          bg-emerald-600
                          px-3
                          py-2.5
                          text-left
                          text-white
                          shadow-[0_8px_24px_rgba(5,150,105,0.25)]
                          transition
                          hover:bg-emerald-700
                          active:scale-[0.98]
                          touch-manipulation
                          lg:min-h-[76px]
                        "
                      >
                        <span
                          className="
                            pointer-events-none
                            absolute
                            -right-5
                            -top-8
                            h-20
                            w-20
                            rounded-full
                            bg-white/10
                            blur-xl
                          "
                        />

                        <div className="relative flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-black">
                              Send Treat
                            </p>

                            <p className="mt-0.5 text-[9px] leading-relaxed text-white/80">
                              Pick food from your pantry.
                            </p>
                          </div>

                          <span
                            className="
                              flex
                              h-8
                              min-w-8
                              items-center
                              justify-center
                              rounded-full
                              bg-white/15
                              px-2
                              font-mono
                              text-[8px]
                              font-black
                              uppercase
                              tracking-wider
                            "
                          >
                            Choose
                          </span>
                        </div>
                      </button>
                    </div>


                  </div>
                </>
              )}
            </div>
          )}

          {/* GLOBAL PARK CHAT */}
          {parkPanelTab ===
            'chat' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-3.5 py-2.5 dark:border-neutral-900 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-black">
                    Park-wide Chat
                  </p>
                  <p className="mt-0.5 truncate text-[9px] text-neutral-500">
                    Everyone in the Pet Park can see and join the conversation.
                  </p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {activeParkPets.length + 1} here
                </span>
              </div>

              <div
                ref={
                  parkChatScrollRef
                }
                className="pet-park-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3.5 py-3 sm:px-5"
              >
                {visibleParkChatMessages.length >
                  0 && (
                  <div className="flex justify-center pb-1">
                    {parkChatHasMore ? (
                      <button
                        type="button"
                        disabled={
                          parkChatLoadingOlder
                        }
                        onClick={
                          loadOlderParkChatMessages
                        }
                        className="min-h-[36px] rounded-full border border-neutral-200 bg-white px-3.5 py-2 font-mono text-[8px] font-black uppercase tracking-wider text-neutral-500 shadow-sm transition active:scale-95 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 touch-manipulation"
                      >
                        {parkChatLoadingOlder
                          ? 'Loading...'
                          : 'Load 10 older'}
                      </button>
                    ) : (
                      <span className="font-mono text-[7px] uppercase tracking-wider text-neutral-400">
                        Beginning of chat
                      </span>
                    )}
                  </div>
                )}

                <div className="mb-2 flex items-center gap-2 px-1">
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                  <span className="font-mono text-[7px] font-black uppercase tracking-wider text-neutral-400">
                    Today · resets 12 AM PH
                  </span>
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                </div>

                {visibleParkChatMessages.length ===
                0 ? (
                  <div className="flex h-full min-h-[100px] items-center justify-center text-center">
                    <div>
                      <p className="text-[12px] font-black">
                        The park is quiet.
                      </p>
                      <p className="mx-auto mt-1 max-w-[260px] text-[10px] leading-relaxed text-neutral-500">
                        Say something and every pet currently hanging out here can see it.
                      </p>
                    </div>
                  </div>
                ) : (
                  visibleParkChatMessages.map(
                    (
                      message
                    ) => {
                      const isMine =
                        message.senderOwnerId ===
                        ownerId;

                      return (
                        <div
                          key={
                            message.id
                          }
                          className={`flex ${
                            isMine
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[88%] rounded-2xl px-3 py-2.5 ${
                              isMine
                                ? 'rounded-br-md bg-emerald-600 text-white'
                                : 'rounded-bl-md bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
                            }`}
                          >
                            <p
                              className={`mb-1 font-mono text-[7px] font-black uppercase tracking-wider ${
                                isMine
                                  ? 'text-white/70'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {isMine
                                ? `${pet.name} · You`
                                : message.senderPetName}
                            </p>

                            <p className="break-words text-[12px] leading-relaxed">
                              {
                                message.text
                              }
                            </p>

                            {isMine && (
                              <button
                                type="button"
                                disabled={
                                  deletingParkChatMessageId ===
                                  message.id
                                }
                                onClick={() =>
                                  deleteParkChatMessage(
                                    message
                                  )
                                }
                                className="
                                  mt-1.5
                                  block
                                  ml-auto
                                  font-mono
                                  text-[7px]
                                  font-bold
                                  uppercase
                                  tracking-wider
                                  text-white/60
                                  transition
                                  hover:text-white
                                  disabled:opacity-40
                                  touch-manipulation
                                "
                              >
                                {deletingParkChatMessageId ===
                                message.id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )
                )}

                <div
                  ref={
                    parkChatEndRef
                  }
                />
              </div>

              <form
                onSubmit={(
                  event
                ) => {
                  event.preventDefault();
                  sendParkChatMessage();
                }}
                className="shrink-0 border-t border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950 sm:px-4"
              >
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <textarea
                      value={
                        parkChatText
                      }
                      maxLength={
                        180
                      }
                      rows={1}
                      enterKeyHint="send"
                      autoComplete="off"
                      autoCorrect="on"
                      spellCheck
                      onChange={(
                        event
                      ) =>
                        setParkChatText(
                          event.target
                            .value
                        )
                      }
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                            'Enter' &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();
                          sendParkChatMessage();
                        }
                      }}
                      placeholder="Message everyone in the park..."
                      className="max-h-24 min-h-[44px] w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[16px] leading-6 outline-none transition focus:border-emerald-500 dark:border-neutral-800 dark:bg-neutral-900"
                    />

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-[8px] text-neutral-400">
                        {parkChatCooldownRemaining > 0
                          ? `Slow mode · ${Math.ceil(
                              parkChatCooldownRemaining /
                                1000
                            )}s`
                          : `Chat as ${pet.name}`}
                      </span>
                      <span className="shrink-0 font-mono text-[7px] text-neutral-400">
                        {parkChatText.length}/180
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      parkChatSending ||
                      parkChatCooldownRemaining >
                        0 ||
                      !parkChatText.trim()
                    }
                    className="mb-[15px] flex h-11 min-w-[58px] shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-3 font-mono text-[9px] font-black uppercase tracking-wider text-white transition active:scale-95 disabled:opacity-40 touch-manipulation"
                  >
                    {parkChatSending
                      ? '...'
                      : parkChatCooldownRemaining >
                          0
                        ? `${Math.ceil(
                            parkChatCooldownRemaining /
                              1000
                          )}s`
                        : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </aside>

        {/* =====================================================
            SEND TREAT PICKER
            Mobile: large bottom sheet
            Desktop: centered dialog
        ====================================================== */}
        {giftTarget && (
          <div
            className="
              fixed
              inset-0
              z-[300]
              flex
              items-end
              justify-center
              bg-neutral-950/65
              backdrop-blur-sm
              sm:items-center
              sm:p-4
            "
            onClick={() => {
              if (!giftLoading) {
                setGiftTarget(
                  null
                );
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Send a treat to ${giftTarget.petName}`}
              onClick={(event) =>
                event.stopPropagation()
              }
              className="
                relative
                flex
                max-h-[82dvh]
                w-full
                flex-col
                overflow-hidden
                rounded-t-[28px]
                border
                border-neutral-200
                bg-white
                shadow-2xl
                dark:border-neutral-800
                dark:bg-neutral-950
                sm:max-h-[680px]
                sm:max-w-md
                sm:rounded-[28px]
              "
              style={{
                paddingBottom:
                  'max(env(safe-area-inset-bottom), 0px)',
              }}
            >
              {/* MOBILE DRAG HANDLE */}
              <div className="flex justify-center pt-2.5 sm:hidden">
                <div className="h-1.5 w-11 rounded-full bg-neutral-200 dark:bg-neutral-800" />
              </div>

              {/* HEADER */}
              <div
                className="
                  shrink-0
                  border-b
                  border-neutral-200
                  px-4
                  pb-4
                  pt-3
                  dark:border-neutral-800
                  sm:px-5
                  sm:pt-5
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      flex
                      h-[66px]
                      w-[66px]
                      shrink-0
                      items-center
                      justify-center
                      overflow-hidden
                      rounded-2xl
                      border
                      border-emerald-200
                      bg-emerald-50
                      dark:border-emerald-900/50
                      dark:bg-emerald-950/30
                    "
                  >
                    <div className="scale-[0.32]">
                      <PetAvatar
                        species={
                          giftTarget.species
                        }
                        equipped={
                          giftTarget.equipped
                        }
                        animation="idle"
                      />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="
                        font-mono
                        text-[8px]
                        font-black
                        uppercase
                        tracking-[0.18em]
                        text-emerald-600
                      "
                    >
                      Send a Treat
                    </p>

                    <h3
                      className="
                        mt-0.5
                        truncate
                        text-lg
                        font-black
                        tracking-tight
                      "
                    >
                      Choose something for {giftTarget.petName}
                    </h3>

                    <p className="mt-0.5 text-[10px] leading-relaxed text-neutral-500">
                      One item will be transferred from your pantry to theirs.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      giftLoading !==
                      null
                    }
                    onClick={() =>
                      setGiftTarget(
                        null
                      )
                    }
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-neutral-200
                      bg-white
                      text-lg
                      text-neutral-500
                      transition
                      active:scale-95
                      disabled:opacity-40
                      dark:border-neutral-800
                      dark:bg-neutral-900
                      touch-manipulation
                    "
                    aria-label="Close treat picker"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* FOOD LIST */}
              <div
                className="
                  pet-park-scroll
                  min-h-0
                  flex-1
                  overflow-y-auto
                  overscroll-contain
                  px-4
                  py-4
                  sm:px-5
                "
              >
                {giftableParkFoods.length ===
                0 ? (
                  <div
                    className="
                      rounded-2xl
                      border
                      border-dashed
                      border-neutral-300
                      bg-neutral-50
                      px-5
                      py-8
                      text-center
                      dark:border-neutral-700
                      dark:bg-neutral-900
                    "
                  >
                    <p className="text-sm font-black">
                      No compatible treats yet
                    </p>

                    <p className="mx-auto mt-2 max-w-[260px] text-[11px] leading-relaxed text-neutral-500">
                      You do not have food that {giftTarget.petName} can eat right now. Universal food works for every pet.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className="
                        mb-3
                        rounded-xl
                        bg-emerald-50
                        px-3
                        py-2.5
                        text-[10px]
                        leading-relaxed
                        text-emerald-800
                        dark:bg-emerald-950/30
                        dark:text-emerald-300
                      "
                    >
                      Tap a treat below to send it to {giftTarget.petName}.
                    </div>

                    <div className="space-y-2.5">
                      {giftableParkFoods.map(
                        (
                          food
                        ) => {
                          const quantity =
                            pantry[
                              food.id
                            ]?.quantity ||
                            0;

                          const isSending =
                            giftLoading ===
                            food.id;

                          return (
                            <button
                              key={
                                food.id
                              }
                              type="button"
                              disabled={
                                giftLoading !==
                                null
                              }
                              onClick={() =>
                                sendParkTreat(
                                  giftTarget,
                                  food
                                )
                              }
                              className={`
                                group
                                flex
                                min-h-[76px]
                                w-full
                                items-center
                                gap-3
                                rounded-2xl
                                border
                                px-3.5
                                py-3
                                text-left
                                transition
                                active:scale-[0.99]
                                disabled:opacity-60
                                touch-manipulation
                                ${
                                  isSending
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                                    : 'border-neutral-200 bg-white hover:border-emerald-400 dark:border-neutral-800 dark:bg-neutral-900'
                                }
                              `}
                            >
                              <div
                                className="
                                  flex
                                  h-11
                                  w-11
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-xl
                                  border
                                  border-emerald-200
                                  bg-emerald-50
                                  dark:border-emerald-900/50
                                  dark:bg-emerald-950/30
                                "
                              >
                                <Icon.Food />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-[12px] font-black">
                                    {
                                      food.name
                                    }
                                  </p>

                                  <span
                                    className="
                                      shrink-0
                                      rounded-full
                                      bg-neutral-100
                                      px-2
                                      py-0.5
                                      font-mono
                                      text-[7px]
                                      font-black
                                      uppercase
                                      tracking-wider
                                      text-neutral-500
                                      dark:bg-neutral-800
                                    "
                                  >
                                    Qty {quantity}
                                  </span>
                                </div>

                                <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-neutral-500">
                                  {
                                    food.description
                                  }
                                </p>
                              </div>

                              <div
                                className={`
                                  flex
                                  min-h-10
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-xl
                                  px-3
                                  font-mono
                                  text-[8px]
                                  font-black
                                  uppercase
                                  tracking-wider
                                  ${
                                    isSending
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                  }
                                `}
                              >
                                {isSending
                                  ? 'Sending...'
                                  : 'Send'}
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* FOOTER */}
              <div
                className="
                  shrink-0
                  border-t
                  border-neutral-200
                  bg-neutral-50
                  px-4
                  py-3
                  dark:border-neutral-800
                  dark:bg-neutral-900/70
                  sm:px-5
                "
              >
                <p className="text-center text-[9px] leading-relaxed text-neutral-500">
                  The treat goes to their pantry. They can choose when to feed it to their pet.
                </p>
              </div>

              {/* SENDING OVERLAY */}
              {giftLoading && (
                <div
                  className="
                    absolute
                    inset-0
                    z-20
                    flex
                    items-center
                    justify-center
                    bg-white/75
                    backdrop-blur-[2px]
                    dark:bg-neutral-950/75
                  "
                >
                  <div
                    className="
                      rounded-2xl
                      border
                      border-neutral-200
                      bg-white
                      px-5
                      py-4
                      text-center
                      shadow-xl
                      dark:border-neutral-800
                      dark:bg-neutral-900
                    "
                  >
                    <div
                      className="
                        mx-auto
                        h-7
                        w-7
                        animate-spin
                        rounded-full
                        border-2
                        border-emerald-500
                        border-t-transparent
                      "
                    />

                    <p className="mt-3 text-sm font-black">
                      Sending treat...
                    </p>

                    <p className="mt-1 text-[10px] text-neutral-500">
                      Bringing it to {giftTarget.petName}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}
      </div>

      <style jsx global>{`
        @supports (-webkit-touch-callout: none) {
          input,
          textarea,
          select {
            font-size: 16px !important;
          }
        }

        .pet-park-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        .pet-axolotl .axolotl-body {
          animation:
            axolotl-soft-float 3.8s ease-in-out infinite;
        }

        .pet-axolotl .axolotl-gill-left {
          animation:
            axolotl-gill-left 2.4s ease-in-out infinite;
        }

        .pet-axolotl .axolotl-gill-right {
          animation:
            axolotl-gill-right 2.4s ease-in-out infinite;
        }

        .pet-axolotl .axolotl-tail {
          animation:
            axolotl-tail-wiggle 3s ease-in-out infinite;
        }

        .pet-axolotl .axolotl-bubble {
          animation:
            axolotl-bubble-float 2.8s ease-in-out infinite;
        }

        .pet-axolotl .axolotl-bubble-delay {
          animation-delay: 1.25s;
        }

        @keyframes axolotl-soft-float {
          0%,
          100% {
            transform:
              translateX(-50%)
              translateY(0);
          }

          50% {
            transform:
              translateX(-50%)
              translateY(-3px);
          }
        }

        @keyframes axolotl-gill-left {
          0%,
          100% {
            transform: rotate(0deg);
          }

          50% {
            transform: rotate(-4deg);
          }
        }

        @keyframes axolotl-gill-right {
          0%,
          100% {
            transform: rotate(0deg);
          }

          50% {
            transform: rotate(4deg);
          }
        }

        @keyframes axolotl-tail-wiggle {
          0%,
          100% {
            transform: rotate(8deg);
          }

          50% {
            transform: rotate(13deg);
          }
        }

        @keyframes axolotl-bubble-float {
          0%,
          100% {
            transform: translateY(5px);
            opacity: 0.3;
          }

          50% {
            transform: translateY(-7px);
            opacity: 0.9;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pet-axolotl .axolotl-body,
          .pet-axolotl .axolotl-gill-left,
          .pet-axolotl .axolotl-gill-right,
          .pet-axolotl .axolotl-tail,
          .pet-axolotl .axolotl-bubble {
            animation: none !important;
          }
        }
      `}</style>

    </main>
  );
}

/* =========================================================
   ACTION BUTTON
========================================================= */

function ActionButton({
  label,
  description,
  icon,
  remaining,
  loading,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  remaining: number;
  loading: boolean;
  onClick: () => void;
}) {
  const unavailable =
    remaining > 0 ||
    loading;

  return (
    <button
      type="button"
      disabled={
        unavailable
      }
      onClick={
        onClick
      }
      className={`
        min-h-[112px]
        rounded-2xl
        border
        p-4
        text-left
        transition-all
        ${
          unavailable
            ? 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 opacity-55'
            : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:border-emerald-500/50 active:scale-[0.98]'
        }
      `}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
        {icon}
      </div>

      <p className="mt-3 font-bold text-sm">
        {label}
      </p>

      <p className="mt-1 font-mono text-[9px] text-neutral-500">
        {remaining > 0
          ? `Ready in ${formatCooldown(
              remaining
            )}`
          : loading
            ? 'Working...'
            : description}
      </p>
    </button>
  );
}

/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 px-5 py-4 bg-white dark:bg-neutral-900">
      <p className="font-bold text-sm">
        {title}
      </p>

      <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
        {description}
      </p>

      <p className="mt-4 font-mono text-[9px] uppercase tracking-wider text-neutral-400">
        Coming next
      </p>
    </div>
  );
}