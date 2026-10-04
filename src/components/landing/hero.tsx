import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Illustrative sample data only. Nothing on this page is read from the database.
const STATS = [
  { label: "Upcoming events", value: "3" },
  { label: "Pending registrations", value: "6" },
  { label: "Awaiting certificate", value: "2" },
] as const;

const EVENTS = [
  { title: "Saturday Pottery Workshop", date: "Sat 18 Oct", spots: "14 / 20", pending: 4 },
  { title: "Neighbourhood Clean-up Day", date: "Sun 26 Oct", spots: "32 / 40", pending: 2 },
  { title: "Intro to Bookkeeping", date: "Thu 30 Oct", spots: "9 / 15", pending: 0 },
] as const;

// Layout decision: the hero text is left-aligned and spans the full panel so the headline fits
// on two lines, and the dashboard preview is cropped by the panel edge so it reads as a window
// onto the product. The preview is decorative (aria-hidden); the live preview section below is
// the interactive, accessible demo.
export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="overflow-hidden rounded-2xl bg-brand text-brand-foreground"
    >
      <div className="flex flex-col gap-10 px-6 pt-12 md:px-12 md:pt-16">
        <div className="flex max-w-2xl flex-col gap-6">
          <h1
            id="hero-heading"
            className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl"
          >
            Run your event without the spreadsheet.
          </h1>
          <p className="max-w-[52ch] text-base leading-relaxed text-brand-foreground/80 md:text-lg">
            Publish an event, approve registrations, mark attendance and issue certificates from one simple
            dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-11 px-5 text-base"
              nativeButton={false}
              render={<Link href="/register" />}
            >
              Get Started for Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 border-brand-foreground/30 bg-transparent px-5 text-base text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground focus-visible:border-brand-foreground focus-visible:ring-brand-foreground/40 dark:border-brand-foreground/30 dark:bg-transparent dark:hover:bg-brand-foreground/10"
              nativeButton={false}
              render={<Link href="#preview" />}
            >
              See Demo
            </Button>
          </div>
        </div>

        <div aria-hidden="true" className="max-h-72 overflow-hidden md:max-h-80">
          <Card className="rounded-b-none bg-card/95">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold">Organizer overview</CardTitle>
              <Badge variant="outline">Sample data</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <dl className="grid gap-3 sm:grid-cols-3">
                {STATS.map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-muted px-4 py-3">
                    <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                    <dd className="text-2xl font-semibold tabular-nums">{stat.value}</dd>
                  </div>
                ))}
              </dl>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Spots taken</TableHead>
                    <TableHead>Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {EVENTS.map((event) => (
                    <TableRow key={event.title}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell className="text-muted-foreground">{event.date}</TableCell>
                      <TableCell className="tabular-nums">{event.spots}</TableCell>
                      <TableCell>
                        <Badge variant={event.pending > 0 ? "secondary" : "outline"}>{event.pending}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
