import { Database } from '@/types/database';

export type DirectoryChapter =
  Database['public']['Functions']['get_public_chapter_directory']['Returns'][number];
export type ChapterJoinPolicy = NonNullable<DirectoryChapter['join_policy']>;
