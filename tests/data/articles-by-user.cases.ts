export type ArticlesByUserCase = {
  userId: number;
  minimumArticleCount: number;
};

export const articlesByUserCases: ArticlesByUserCase[] = [
  { userId: 1, minimumArticleCount: 1 },
  { userId: 2, minimumArticleCount: 1 },
];
