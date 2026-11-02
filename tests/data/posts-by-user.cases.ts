export type PostsByUserCase = {
  userId: number;
  minimumPostCount: number;
};

export const postsByUserCases: PostsByUserCase[] = [
  { userId: 1, minimumPostCount: 1 },
  { userId: 2, minimumPostCount: 1 },
];
