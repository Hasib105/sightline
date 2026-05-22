"use client";

import { Reveal } from "@/components/motion/Reveal";
import { GradientText } from "@/components/motion/GradientText";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqs } from "@/data/faqs";

export function Faq() {
  return (
    <section id="faq" className="container mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-[clamp(2rem,4.2vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight sm:whitespace-nowrap">
          <GradientText>Questions,</GradientText> answered
        </h2>
        <p className="mt-4 text-muted-foreground sm:text-lg">
          Answers are aligned with the product requirements and architecture docs in this repository.
        </p>
      </Reveal>

      <Reveal className="mx-auto mt-12 max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-card">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="border-border-subtle px-5 last:border-0">
                <AccordionTrigger className="py-5 text-left font-display text-base font-bold sm:text-lg">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm text-muted-foreground sm:text-[15px]">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Reveal>
    </section>
  );
}
