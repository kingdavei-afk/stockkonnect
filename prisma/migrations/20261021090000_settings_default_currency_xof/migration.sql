-- Le public visé paye en franc CFA : la devise par défaut d'une
-- organisation sans réglage devient le XOF (au lieu de l'Euro).
ALTER TABLE "Settings" ALTER COLUMN "currency" SET DEFAULT 'XOF';
