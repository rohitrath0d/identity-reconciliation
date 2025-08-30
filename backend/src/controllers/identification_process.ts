import type { Request, Response } from "express";
// import { prisma } from "../db/init_db.ts";
import { prisma } from "../db/init_db.js";
import { Prisma } from "@prisma/client";


// interface Contact {
//   email?: string;
//   phoneNumber?: string
// }

export const identificationProcess = async (req: Request, res: Response): Promise<void> => {

  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      // return res.status(400).json({
      res.status(400).json({
        success: false,
        error: "Either email or phoneNumber is required"
      })
      return;
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


    // because of OR conditions, this failed, because:-   .filter(Boolean) narrows values at runtime, but TS still thinks there could be undefined in the array.
    // Prisma expects ContactWhereInput[], not (ContactWhereInput | undefined)[].
    // let where: Prisma.ContactWhereInput[] = {};              
    // if (email && phoneNumber) {                               
    //   // both provided → OR condition
    //   where = { OR: [{ email }, { phoneNumber }] };
    // } else if (email) {
    //   // only email provided
    //   where = { email };
    // } else if (phoneNumber) {
    //   // only phone provided
    //   where = { phoneNumber };
    // }

    // const existingContacts = await prisma.contact.findMany({
    //   where: {
    //     OR: [
    //       email ? { email } : undefined,
    //       phoneNumber ? { phoneNumber } : undefined,
    //     ].filter(Boolean),
    //   },
    //   orderBy: { createdAt: "asc" },
    // });


    // hence explicitly building the array without 'undefined'
    const orConditions: Prisma.ContactWhereInput[] = [];
    if (email) orConditions.push({ email: email });
    if (phoneNumber) orConditions.push({ phoneNumber: phoneNumber });

    const existingContacts = await prisma.contact.findMany({
      where: {
        // OR: orConditions.length > 0 ? orConditions : undefined   
        OR: orConditions,
        deletedAt: null, // Skip soft-deleted contacts
      },
      orderBy: { createdAt: "asc" },
    })
    console.log("Found contacts", existingContacts);


    // if none contact is found, map it to primary
    if (existingContacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkedPrecedence: "primary"
        },
      });

      // return res.json({
      res.json({
        success: true,
        contact: {
          // "primaryContactId": number,
          "primaryContactId": newContact.id,
          // "emails": string[],                                      // first element being email of primary contact 
          "emails": email ? [email] : [],                            // first element being email of primary contact 
          // "phoneNumbers": string[],                              // first element being phoneNumber of primary contact
          "phoneNumbers": phoneNumber ? [phoneNumber] : [],        // first element being phoneNumber of primary contact
          // "secondaryContactIds": number[]                      // Array of all Contact IDs that are "secondary" to the primary contact
          "secondaryContactIds": []                              // Array of all Contact IDs that are "secondary" to the primary contact
        }
      })

    } else if (existingContacts.length > 0) {         // for existing contact in db

      // const primaryContact = existingContacts.find(primary => primary.linkedPrecedence === "primary")       // primary contact - old one
      let primaryContact = existingContacts.find((primaryContact) => primaryContact.linkedPrecedence === "primary")
      // fallback - picking oldest one
      if (primaryContact) {
        // primaryContact = existingContacts[0]  -- cannot assign coz it is constant
        primaryContact = existingContacts[0]
      }

      const emails: string[] = [];
      const phoneNumbers: string[] = []
      const secondaryContactIds: number[] = []

      // looping through contact and finding emails/phoneNumbers/secondary and pushing it to array
      for (const contact of existingContacts) {
        if (contact.email && !emails.includes(contact.email)) emails.push(contact.email);

        if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) phoneNumbers.push(contact.phoneNumber);

        // if contact is secondary -> collect the IDs
        // if (contact.id !== primaryContact.id) secondaryContactIds.push(contact.id);
        if (primaryContact && contact.id !== primaryContact.id) {
          // if (contact.id !== primaryContact.id) secondaryContactIds.push(contact.id);
          secondaryContactIds.push(contact.id);
        }
      }

      // in response array, setting primary email/phoneNumber on the 0th index
      // emails.sort((primaryEmail, SecondaryEmail) => (primaryEmail === primaryContact.email ? -1 : 0))   // --> Error: primaryContact is not defined at runtime
      // phoneNumbers.sort((primaryPhoneNumbers, SecondaryPhoneNumbers) => (primaryPhoneNumbers === primaryContact.phoneNumber ? -1 : 0))

      // if (primaryContact) {
      //   emails.sort((primaryEmail, SecondaryEmail) => (primaryEmail === primaryContact.email ? -1 : 0));
      //   phoneNumbers.sort((primaryPhoneNumbers, SecondaryPhoneNumbers) => (primaryPhoneNumbers === primaryContact.phoneNumber ? -1 : 0));
      // }

      // Deduplication: Ensure no duplicates in arrays
      const uniqueEmails = [...new Set(emails)];
      const uniquePhoneNumbers = [...new Set(phoneNumbers)];

      if (!primaryContact) {
        throw new Error("No primary contact found");
      }

      // Bridge two primaries: Merge under the oldest primary
      if (email && phoneNumber) {
        const primaryCandidates = existingContacts.filter(
          (contact) => contact.linkedPrecedence === "primary"
        );
        if (primaryCandidates.length > 1) {
          primaryCandidates.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          primaryContact = primaryCandidates[0];

          // Update other primaries to secondary
          for (const contact of primaryCandidates.slice(1)) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: { linkedPrecedence: "secondary", linkedId: primaryContact!.id },
            });
            secondaryContactIds.push(contact.id);
          }
        }
      }



      // Already secondary request: Ensure consolidation under true primary
      if (primaryContact) {
        for (const contact of existingContacts) {
          if (
            contact.linkedPrecedence === "secondary" &&
            contact.linkedId !== primaryContact.id
          ) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: { linkedId: primaryContact.id },
            });
          }
        }
      }

      // build the final response
      const response = {
        primaryContactId: primaryContact!.id,  // this was showing undefined, hence checking, and throwing error
        emails: uniqueEmails,
        phoneNumbers: uniquePhoneNumbers,
        secondaryContactIds
      }

      res.json({
        success: true,
        // contact: primaryContact
        contact: response
      });
    }

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: "identification process failed",
      // error: error.message
    })
  }
}