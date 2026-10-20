import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  canonicalIdentifier,
  isEmailLike,
  isSameWhatsapp,
  whatsappDigits,
} from "../src/lib/login-identifier";

describe("normalisation de l'identifiant", () => {
  test("reconnaît un email", () => {
    assert.equal(isEmailLike("demo@stockkonect.fr"), true);
    assert.equal(isEmailLike("demo@stockkonect"), false);
    assert.equal(isEmailLike("07 99 88 77 66"), false);
  });

  test("réduit un numéro à ses chiffres, sans préfixe 00", () => {
    assert.equal(whatsappDigits("+225 07 99 88 77 66"), "2250799887766");
    assert.equal(whatsappDigits("00225 07 99 88 77 66"), "2250799887766");
    assert.equal(whatsappDigits("07-99-88-77-66"), "0799887766");
    assert.equal(whatsappDigits("1234567"), null);
    assert.equal(whatsappDigits("+225 07 99 88 77 66 12 34"), null);
    assert.equal(whatsappDigits("abc"), null);
  });

  test("compare deux écritures du même numéro sur 9 chiffres", () => {
    assert.equal(isSameWhatsapp("+225 07 99 88 77 66", "07 99 88 77 66"), true);
    assert.equal(isSameWhatsapp("00225 07 99 88 77 66", "+2250799887766"), true);
    assert.equal(isSameWhatsapp("+225 07 99 88 77 66", "+225 07 99 88 77 67"), false);
    assert.equal(isSameWhatsapp("demo@example.fr", "+2250799887766"), false);
  });

  test("canonicalise les emails et les numéros pour le compteur", () => {
    assert.equal(canonicalIdentifier("  Demo@Example.FR  "), "email:demo@example.fr");
    for (const variant of [
      "+225 07 99 88 77 66",
      "00225 07 99 88 77 66",
      "+2250799887766",
      "07 99 88 77 66",
      "0799887766",
    ]) {
      assert.equal(canonicalIdentifier(variant), "whatsapp:799887766", variant);
    }
  });

  test("retombe sur la valeur brute pour une saisie inclassable", () => {
    assert.equal(canonicalIdentifier("  Inconnu  "), "raw:inconnu");
    assert.equal(canonicalIdentifier("1234567"), "raw:1234567");
  });
});
