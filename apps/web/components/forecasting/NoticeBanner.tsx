// NoticeBanner 组件展示操作成功或失败后的反馈信息。
import type { Notice } from './types';

type NoticeBannerProps = {
  notice: Notice | null;
};

export function NoticeBanner({ notice }: NoticeBannerProps) {
  if (!notice) {
    return null;
  }

  return <div className={`notice ${notice.kind}`}>{notice.text}</div>;
}
