import { P as bio_extratus_1 } from "./bio-extratus_1";
import { P as bio_extratus_2 } from "./bio-extratus_2";
import { P as salon_line_cremes_1 } from "./salon-line-cremes_1";
import { P as salon_line_cremes_2 } from "./salon-line-cremes_2";
import { P as rexona_clinical_1 } from "./rexona-clinical_1";
import { P as rexona_clinical_2 } from "./rexona-clinical_2";
import { P as dove_oleo_serum_1 } from "./dove-oleo-serum_1";
import { P as dove_oleo_serum_2 } from "./dove-oleo-serum_2";
import { P as dove_oleo_serum_3 } from "./dove-oleo-serum_3";
import { P as salon_line_matizadora_1 } from "./salon-line-matizadora_1";
import { P as salon_line_matizadora_2 } from "./salon-line-matizadora_2";
import { P as dove_banho_1 } from "./dove-banho_1";
import { P as dove_banho_2 } from "./dove-banho_2";

export const PHOTOS: Record<string, string> = {
  "bio-extratus": bio_extratus_1 + bio_extratus_2,
  "salon-line-cremes": salon_line_cremes_1 + salon_line_cremes_2,
  "rexona-clinical": rexona_clinical_1 + rexona_clinical_2,
  "dove-oleo-serum": dove_oleo_serum_1 + dove_oleo_serum_2 + dove_oleo_serum_3,
  "salon-line-matizadora": salon_line_matizadora_1 + salon_line_matizadora_2,
  "dove-banho": dove_banho_1 + dove_banho_2,
};
