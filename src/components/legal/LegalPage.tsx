import Link from "next/link";
import { Header } from "@/components/Header";
import { LEGAL_SUPPORT_EMAIL, type LegalPageContent } from "@/lib/legal/legalContent";

export function LegalPage({ page }: { page: LegalPageContent }) {
    return (
        <main className="min-h-screen bg-[#fffcf8] pt-28 px-5 pb-20">
            <Header />
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 rounded-3xl border border-orange-100 bg-white p-8 shadow-sm md:p-12">
                    <p className="mb-3 text-sm font-black uppercase tracking-[0.24em] text-orange-600">ShotcutCrew Legal</p>
                    <h1 className="font-display text-4xl font-black tracking-tight text-stone-950 md:text-6xl">{page.title}</h1>
                    <p className="mt-5 max-w-3xl text-lg leading-relaxed text-stone-600">{page.description}</p>
                    <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-stone-500">
                        <span className="rounded-full bg-orange-50 px-4 py-2 text-orange-700">Last Updated: {page.lastUpdated}</span>
                        <a className="rounded-full bg-stone-100 px-4 py-2 hover:text-orange-700" href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>
                            {LEGAL_SUPPORT_EMAIL}
                        </a>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                            <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-stone-400">On this page</p>
                            <nav className="space-y-2">
                                {page.sections.map((section) => (
                                    <Link
                                        key={section.id}
                                        href={`#${section.id}`}
                                        className="block rounded-xl px-3 py-2 text-sm font-bold text-stone-600 hover:bg-orange-50 hover:text-orange-700"
                                    >
                                        {section.title}
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm md:p-10">
                        <div className="space-y-12">
                            {page.sections.map((section) => (
                                <section key={section.id} id={section.id} className="scroll-mt-28">
                                    <h2 className="font-display text-2xl font-black tracking-tight text-stone-950 md:text-3xl">
                                        {section.title}
                                    </h2>
                                    {section.body?.map((paragraph) => (
                                        <p key={paragraph} className="mt-4 leading-8 text-stone-600">
                                            {paragraph}
                                        </p>
                                    ))}
                                    {section.bullets && (
                                        <ul className="mt-5 space-y-3">
                                            {section.bullets.map((item) => (
                                                <li key={item} className="flex gap-3 leading-7 text-stone-600">
                                                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {section.table && (
                                        <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-orange-50 text-stone-900">
                                                    <tr>
                                                        {section.table.headers.map((header) => (
                                                            <th key={header} className="px-4 py-3 font-black">{header}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100">
                                                    {section.table.rows.map((row) => (
                                                        <tr key={row.join("-")}>
                                                            {row.map((cell) => (
                                                                <td key={cell} className="px-4 py-3 leading-6 text-stone-600">{cell}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            ))}
                        </div>
                    </article>
                </div>
            </div>
        </main>
    );
}
