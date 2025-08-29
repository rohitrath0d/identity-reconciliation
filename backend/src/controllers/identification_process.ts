import type { Request, Response } from "express";
import { prisma } from "../db/init_db.ts";
import type { Prisma } from "@prisma/client";

// interface Contact {
//   email?: string;
//   phoneNumber?: string
// }

export const identificationProcess = async (req: Request, res: Response) => {

  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Either email or phoneNumber is required"
      })
    }

    // finding if there's an existing contact
    // const existingContacts = await prisma.contact.findMany({
    //   where: {
    //     OR: [
    //       email ? { email} : undefined,
    //       phoneNumber ? { phoneNumber } : undefined,
    //     ].filter(Boolean),
    //   },
    //   orderBy: { createdAt: "asc" }
    // });

    let where: Prisma.ContactWhereInput = {};

    if (email && phoneNumber) {
      // both provided → OR condition
      where = { OR: [{ email }, { phoneNumber }] };
    } else if (email) {
      // only email provided
      where = { email };
    } else if (phoneNumber) {
      // only phone provided
      where = { phoneNumber };
    }

    const existingContacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    // if none is found, map it to primary
    if (existingContacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkedPrecedence: "primary"
        },
      });


      return res.json({
        success: true,
        contact: {
          // "primaryContatctId": number,
          "primaryContatctId": newContact.id,
          // "emails": string[],                   // first element being email of primary contact 
          "emails": email ? [email] : [],                            // first element being email of primary contact 
          // "phoneNumbers": string[],             // first element being phoneNumber of primary contact
          "phoneNumbers": phoneNumber ? [phoneNumber] : [],             // first element being phoneNumber of primary contact
          // "secondaryContactIds": number[]       // Array of all Contact IDs that are "secondary" to the primary contact
          "secondaryContactIds": []       // Array of all Contact IDs that are "secondary" to the primary contact
        }
      })
    }

    // // if(email)
    // res.status(200).json({
    //   // {
    //   //   "contact": {
    //   //     "primaryContatctId": number,
    //   //     "emails": string[], // first element being email of primary contact 
    //   //     "phoneNumbers": string[], // first element being phoneNumber of primary contact
    //   //     "secondaryContactIds": number[] // Array of all Contact IDs that are "secondary" to the primary contact
    //   //   }
    //   // }
    //   success: true,
    //   message: "Order placed!"
    // }
    // )


  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "identification process failed",
      // error: error.message
    })
  }
}