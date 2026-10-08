import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 2026">
      <section>
        <h2>What RickshawMate does</h2>
        <p>
          RickshawMate helps commuters in Dhaka find someone to share a rickshaw with at fixed
          landmarks. To make that work, some information is shared with other commuters.
        </p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <b>Account:</b> your email address, and your name and profile picture if you sign in with Google.
          </li>
          <li>
            <b>Ride posts:</b> your name, the standing note you write, your route and the photo you upload.
          </li>
          <li>
            <b>Phone number:</b> the mobile number you enter when you post or share a ride.
          </li>
          <li>
            <b>Activity:</b> the rides you post or join, so we can show your history and basic profile
            statistics.
          </li>
          <li>
            <b>On your device:</b> your language, theme, last route and saved name/number are stored in your
            browser only.
          </li>
        </ul>
      </section>
      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>
            <b>Everyone</b> viewing a route can see the name, photo and standing note of people currently
            waiting there. Only upload a photo you are comfortable showing publicly.
          </li>
          <li>
            <b>Your phone number</b> is shown only to the one person you are matched with, and only after the
            match.
          </li>
          <li>
            <b>Profiles</b> show your name, photo, number of shared rides and the month you joined. They never
            show your phone number or email.
          </li>
        </ul>
      </section>
      <section>
        <h2>How it is stored</h2>
        <p>
          Data is stored with Supabase (database, file storage and sign-in). Posts are marked expired after 15
          minutes but stay in your ride history. We do not sell your data and we do not run advertising or
          analytics trackers.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can remove a live post at any time. To delete your account and data, contact us using the details
          below.
        </p>
      </section>
      <ContactLine />
    </LegalPage>
  );
}
