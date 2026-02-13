import Image from "next/image";
import Link from "next/link";

export default function FlowHeader() {
  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
  src="/flow-logo1.png"
  alt="Flow"
  width={160}
  height={50}
  priority
  unoptimized
  style={{ height: "100px", width: "auto" }}
/>
        </Link>
      </div>
    </header>
  );
}