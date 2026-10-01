import { EmailForm } from "@/components/EmailForm";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const unsubscribed = params.unsubscribed === "1";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="shell hero">
      <div className="hero-inner">
        <h1 className="brand">BonusMelding</h1>
        <p className="tagline">
          Volg je favoriete Albert Heijn-producten en krijg een mail zodra ze in
          de bonus staan.
        </p>
        {unsubscribed ? (
          <p className="banner">Je bent afgemeld. Tot ziens!</p>
        ) : null}
        {error ? (
          <p className="form-msg error">
            De link is ongeldig of verlopen. Vraag hieronder een nieuwe aan.
          </p>
        ) : null}
        <EmailForm />
        <p className="hero-note">
          We sturen je een magische link — geen wachtwoord nodig. Elke maandag
          checken we de nieuwe bonusfolder.
        </p>
      </div>
    </main>
  );
}
