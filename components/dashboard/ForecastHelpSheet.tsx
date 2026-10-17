"use client";

import { CircleHelp } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import styles from "./ForecastPanel.module.css";

const steps = [
  { title: "Свободен запас", text: "От физическата наличност изваждаме количествата в планирани и одобрени изходящи пратки. Изпратената кръв вече е извадена от наличностите." },
  { title: "Очаквано потребление", text: "Прогнозата е за следващите 48 часа, без допълнително увеличение на потреблението. Потребността се изчислява по зададения профил, капацитет, регион и сезонност. Разпределяме я равномерно в рамките на всеки 24 часа." },
  { title: "Пътуващи доставки", text: "Включваме само пратки в движение или със закъснение, в очаквания им час на пристигане. Това са очаквани количества — наличността се променя след потвърдено получаване." },
  { title: "Необходимо допълване", text: "„За допълване“ е най-големият непокрит недостиг през избрания период, включително преди закъсняла доставка. Излишъкът от една група не компенсира друга. Не се добавя допълнителен резерв." },
];

export function ForecastHelpSheet() {
  return <Sheet>
    <SheetTrigger type="button" className={styles.helpTrigger} aria-label="Разчитане на прогнозата" title="Разчитане на прогнозата"><CircleHelp size={25} strokeWidth={1.8} aria-hidden="true" /></SheetTrigger>
    <SheetContent side="right" className="overflow-y-auto bg-white p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[480px] data-[side=right]:data-starting-style:translate-x-full data-[side=right]:data-ending-style:translate-x-full motion-reduce:transition-none">
      <SheetHeader className="gap-3 border-b border-slate-100 p-7 pr-12">
        <SheetTitle className="text-lg font-semibold text-slate-900">Разчитане на прогнозата</SheetTitle>
        <SheetDescription className="text-sm leading-6 text-slate-500">Изчисления, доставки и недостиг за следващите 48 часа.</SheetDescription>
      </SheetHeader>
      <div className="space-y-7 px-7 pb-8 pt-2">
        <ol className="space-y-7">
          {steps.map((step, index) => <li key={step.title} className="flex gap-3.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-semibold text-[#cf4829]">{index + 1}</span>
            <div><h3 className="mb-2 pt-0.5 text-sm font-semibold text-slate-900">{step.title}</h3><p className="text-sm leading-7 text-slate-500">{step.text}</p></div>
          </li>)}
        </ol>
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Линии в графиката</h3>
          <p className="text-sm leading-6 text-slate-500"><strong className="font-medium text-[#cf4829]">Оранжевата линия</strong> показва баланса с пътуващите доставки, а <strong className="font-medium text-slate-700">сивият пунктир</strong> — какво би останало без тях.</p>
          <p className="text-sm leading-6 text-slate-500">Под нулата има непокрита потребност. Покачването показва очаквано пристигане на пратка.</p>
        </section>
      </div>
    </SheetContent>
  </Sheet>;
}
