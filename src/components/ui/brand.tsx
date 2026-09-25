import Image from "next/image";

export function Brand() {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Image
        src="/logo-lsms.svg"
        alt=""
        width={42}
        height={42}
        className="size-9 shrink-0"
        priority
      />
      <strong className="text-[19px] font-bold tracking-[-.05em] text-[#263324]">
        LSMS
      </strong>
    </span>
  );
}
