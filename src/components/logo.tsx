import darkLogo from "@/assets/logos/dark.svg";
import logo from "@/assets/logos/main.svg";
import Image from "next/image";

export function Logo() {
  return (
    <div className="relative h-8 w-8 max-w-[2rem]">
      <Image
        src={logo}
        fill
        className="dark:hidden"
        alt="EdVentureHub logo"
        role="presentation"
        quality={100}
      />

      <Image
        src={darkLogo}
        fill
        className="hidden dark:block"
        alt="EdVentureHub logo"
        role="presentation"
        quality={100}
      />
    </div>
  );
}
