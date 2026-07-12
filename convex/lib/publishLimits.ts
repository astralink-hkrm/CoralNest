export const MAX_PUBLISH_TOTAL_BYTES = 50 * 1024 * 1024;
export const MAX_PUBLISH_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CLAWPACK_BYTES = 120 * 1024 * 1024;

type SizedPathLike = {
  path: string;
  size: number;
};

export function findOversizedPublishFile<TFile extends SizedPathLike>(files: TFile[]) {
  return files.find((file) => file.size > MAX_PUBLISH_FILE_BYTES) ?? null;
}

export function getPublishFileSizeError(path: string) {
  return `File "${path}" exceeds 10MB limit`;
}

export function getPublishTotalSizeError() {
  return "Skill bundle exceeds 50MB limit";
}
