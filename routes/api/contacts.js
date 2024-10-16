import express from "express";
import Joi from "joi";
import Contact from "../../models/contacts.model.js";
import auth from "../../middlewares/auth.middleware.js";

const contactSchema = Joi.object({
  name: Joi.string().required().messages({
    "any.required": "Set name for contact",
  }),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^[0-9]+$/)
    .required(),
  favorite: Joi.boolean().default(false),
});

const router = express.Router();

// Modificarea rutei GET / pentru a include middleware-ul de autentificare
router.get("/", auth, async (req, res, next) => {
  try {
    // Extragem parametrii de paginare și filtrare din query
    const { page = 1, limit = 20, favorite } = req.query;
    const skip = (page - 1) * limit; // Calculăm offset-ul pentru paginare

    const query = { owner: req.user._id }; // Căutăm doar contactele utilizatorului curent
    if (favorite !== undefined) {
      query.favorite = favorite === "true"; // Filtrăm contactele după câmpul favorite
    }

    const contacts = await Contact.find(query).skip(skip).limit(Number(limit)); // Obținem contactele
    res.status(200).json(contacts); // Returnăm contactele
  } catch (error) {
    next(error); // Transmiterea erorii mai departe
  }
});

// Rutele pentru obținerea unui contact după ID, crearea, ștergerea, actualizarea și modificarea favorite rămân la fel

router.get("/:contactId", async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const contact = await Contact.findById(contactId);
    if (contact) {
      res.status(200).json(contact);
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { error } = contactSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Creăm contactul cu owner setat la ID-ul utilizatorului curent
    const contact = new Contact({ ...req.body, owner: req.user._id }); // Adăugăm proprietatea owner
    await contact.save();
    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
});

router.delete("/:contactId", async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const contact = await Contact.findByIdAndDelete(contactId);
    if (contact) {
      res.status(200).json({ message: "Contact Deleted" });
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    next(error);
  }
});

router.put("/:contactId", async (req, res, next) => {
  try {
    const { error } = contactSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { contactId } = req.params;
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      req.body,
      { new: true }
    );
    if (updatedContact) {
      res.status(200).json(updatedContact);
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    next(error);
  }
});

router.patch("/:contactId/favorite", async (req, res, next) => {
  const { contactId } = req.params;
  const { favorite } = req.body;

  if (typeof favorite !== "boolean") {
    return res.status(400).json({ message: "missing field favorite" });
  }

  try {
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { favorite },
      { new: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ message: "Not found" });
    }

    res.status(200).json(updatedContact);
  } catch (error) {
    next(error);
  }
});

export default router;
