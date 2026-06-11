import { Bell, CalendarDays, Dumbbell, Megaphone } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { notices } from "@/lib/mock-data";

const noticeIcon = {
  event: CalendarDays,
  tournament: Megaphone,
  practice: Dumbbell,
  association: Bell
};

const noticeLabel = {
  event: "イベント案内",
  tournament: "大会案内",
  practice: "練習会案内",
  association: "協会からのお知らせ"
};

export default function NoticesPage() {
  return (
    <PageShell
      eyebrow="News"
      title="お知らせ"
      description="イベント案内、大会案内、練習会案内、協会からのお知らせを掲載します。"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {notices.map((notice) => {
          const Icon = noticeIcon[notice.type];

          return (
            <article key={notice.id} className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-ocean-50 px-3 py-1 text-xs font-black text-ocean-700">
                  <Icon className="size-4" aria-hidden="true" />
                  {noticeLabel[notice.type]}
                </span>
                <time className="text-xs font-bold text-slate-500">{notice.publishedAt}</time>
              </div>
              <h2 className="text-xl font-black text-ink">{notice.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{notice.body}</p>
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
