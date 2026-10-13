import { AccountTabs } from "./account-tabs";
import { LogoutButton } from "./logout-button";

export function AccountHeader({ current, title }: { current: string; title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[clamp(2.5rem,8vw,4.5rem)] uppercase leading-[0.9] tracking-tight">
          {title}
        </h1>
        <LogoutButton />
      </div>
      <AccountTabs current={current} />
    </div>
  );
}
