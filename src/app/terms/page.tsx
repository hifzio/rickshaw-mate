import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="October 2026">
      <section>
        <h2>The service</h2>
        <p>
          RickshawMate is a matching tool. We do not provide rickshaws, set fares, or take part in rides. Any
          arrangement you make with another commuter is between you and them.
        </p>
      </section>
      <section>
        <h2>Your responsibilities</h2>
        <ul>
          <li>Give accurate information and use only a photo of a landmark, shop sign or yourself.</li>
          <li>Agree on the total rickshaw fare with the other person before boarding.</li>
          <li>Be respectful. Do not harass, impersonate or spam other people.</li>
          <li>Use your own judgement about safety and meet only at the public landmark you posted.</li>
        </ul>
      </section>
      <section>
        <h2>Content and accounts</h2>
        <p>
          You are responsible for what you post. We may remove posts or accounts that break these terms or put
          others at risk.
        </p>
      </section>
      <section>
        <h2>No guarantees</h2>
        <p>
          The service is provided as is. We cannot guarantee that someone will be waiting, that a match will
          happen, or the conduct of any user, and we are not liable for losses arising from rides you arrange.
        </p>
      </section>
      <ContactLine />
    </LegalPage>
  );
}
