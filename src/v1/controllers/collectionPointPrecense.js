import { Op } from "sequelize";
import db from "../../models/index.js";
import createHttpError from "http-errors";
import { createTask, detailTask, listTasks } from "./tasks.js";
import * as z from "zod";
import { deleteSchedule, listSchedules } from "./taskSchedule.js";
import { idSchema } from "../../services/zod.js";

const getDateFromDay = (day) => {
  const today = new Date();
  let d;
  let i = 0;
  while (i < 7) {
    const jour = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(
      today.setDate(today.getDate() + 1),
    );
    if (jour == day.toLowerCase()) {
      d = today;
      break;
    }
    i++;
  }
  if (!d) throw new createHttpError[400]();
  return d;
};

const dataSchema = z.object({
  collection_point_id: idSchema(
    "ID du point de collecte et jour de la semaine sont obligatoires",
  ),
  store_id: idSchema().nullish(),
  day_of_week: z
    .enum([
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ])
    .transform((val) => getDateFromDay(val)),
  is_open: z.coerce.boolean().default(true),
  start_time: z.union([
    z.iso.time().transform((val) => {
      const [hours, min] = val.split(":");
      return new Date().setHours(hours, min);
    }),
    z.coerce.date(),
  ]),
  end_time: z.union([
    z.iso.time().transform((val) => {
      const [hours, min] = val.split(":");
      return new Date().setHours(hours, min);
    }),
    z.coerce.date(),
  ]),
  is_24h: z.coerce.boolean().default(false),
  notes: z.string().nullish(),
  is_present: z.coerce.boolean().default(true),
});

const { CollectionPointPresence, CollectionPoint, TaskSchedule, Task } = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listPointPrecense = async (req, res) => {
  return await listSchedules(req, res);
  const presence_hours = await CollectionPointPresence.findAll({
    include: [{ model: CollectionPoint }],
  });
  res.json({
    success: true,
    presence_hours,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailPointPrecense = async (req, res) => {
  const { collectionPointId } = req.params;

  return detailTask(req, res);
  const presence_hours = await CollectionPointPresence.findByPk(
    collectionPointId,
    { include: [{ model: CollectionPoint }], order: [["day_of_week"]] },
  );
  res.json({
    success: true,
    presence_hours,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createPointPrecense = async (req, res) => {
  const data = dataSchema.parse(req.body);

  const point = await CollectionPoint.findByPk(data.collection_point_id, {
    include: [{ model: TaskSchedule, where: { category: "point" }, required: false }],
  });
  // const existing = await TaskSchedule.findAll({
  //   where: {
  //     category: "point",
  //     collection_point_id: data.collection_point_id,
  //   },
  // });
  if (!point) throw new createHttpError.NotFound("point pas trouvé");
  // const existing = point.get({ plain: true }).TaskSchedules || [];

  // const toMinutes = (/** @type {Date | number} */ v) => {
  //   const d = v instanceof Date ? v : new Date(v);
  //   return d.getHours() * 60 + d.getMinutes();
  // };
  // const newStart = toMinutes(data.start_time);
  // const newEnd = toMinutes(data.end_time);
  // const dayRef =
  //   data.day_of_week instanceof Date
  //     ? data.day_of_week
  //     : new Date(data.day_of_week);
  // const newDay = dayRef.getDay();

  // const hasOverlap = existing.some((e) => {
  //   if (!e.scheduled_date || !e.start_time || !e.end_time) return false;
  //   if (e.scheduled_date.getDay() !== newDay) return false;
  //   const start = toMinutes(e.start_time);
  //   const end = toMinutes(e.end_time);
  //   return start < newEnd && end > newStart;
  // });

  // if (hasOverlap) {
  //   throw createHttpError.Conflict(
  //     "Un créneau chevauche déjà ce horaire pour ce point de collecte et ce jour",
  //   );
  // }

  const presence = await TaskSchedule.create({
    name: point.name,
    category: "point",
    scheduled_date: data.day_of_week,
    recurrence_pattern: "weekly",
    collection_point_id: data.collection_point_id,
    store_id: point.recyclery_id,
    ...data,
  });

  // const where = {};
  // if (day_of_week) where.day_of_week = day_of_week;
  // if (time_slot_name) where.time_slot_name = time_slot_name;
  // if (store_id) where.store_id = store_id;
  // if (collection_point_id) where.collection_point_id = collection_point_id;
  // const existing = await CollectionPointPresence.findOne({
  //   where,
  // });
  // // Vérifier si des jours de présence existent déjà pour ce point, ce jour et ce créneau
  // if (existing) {
  //   return res.status(400).json({
  //     success: false,
  //     message:
  //       "Des jours de présence existent déjà pour ce point, ce jour et ce créneau",
  //   });
  // }

  // const presence = await CollectionPointPresence.create({
  //   collection_point_id,
  //   store_id,
  //   day_of_week: day_of_week || null,
  //   time_slot_name,
  //   is_present,
  //   start_time,
  //   end_time,
  //   is_24h,
  //   notes,
  // });

  res.json({
    success: true,
    message: "Jours de présence créés avec succès",
    id: presence.id,
    presence,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updatePointPrecense = async (req, res) => {
  const data = dataSchema.parse(req.body);
  const id = idSchema().parse(req.params.id);
  const existing = await TaskSchedule.findByPk(id);

  // const existing = await CollectionPointPresence.findByPk(id);
  // Vérifier que les jours de présence existent

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Jours de présence non trouvés",
    });
  }

  // const conflict = await TaskSchedule.findAll({
  //   where: {
  //     //TODO faudra comparer les heures aussi
  //     category: "point",
  //     collection_point_id: data.collection_point_id,
  //     ...(data.store_id ? { store_id: data.store_id } : {}),
  //     id: { [Op.ne]: id },
  //   },
  // });

  // const toMinutes = (/** @type {Date | number} */ v) => {
  //   const d = v instanceof Date ? v : new Date(v);
  //   return d.getHours() * 60 + d.getMinutes();
  // };
  // const newStart = toMinutes(data.start_time);
  // const newEnd = toMinutes(data.end_time);
  // const dayRef =
  //   data.day_of_week instanceof Date
  //     ? data.day_of_week
  //     : new Date(data.day_of_week);
  // const newDay = dayRef.getDay();

  // const hasOverlap = conflict.some((e) => {
  //   if (!e.scheduled_date || !e.start_time || !e.end_time) return false;
  //   if (e.scheduled_date.getDay() !== newDay) return false;
  //   const start = toMinutes(e.start_time);
  //   const end = toMinutes(e.end_time);
  //   return start < newEnd && end > newStart;
  // });

  // if (hasOverlap) {
  //   throw createHttpError.Conflict(
  //     "Un créneau chevauche déjà ce horaire pour ce point de collecte et ce jour",
  //   );
  // }

  // const conflict = await CollectionPointPresence.findOne({
  //   where: {
  //     collection_point_id,
  //     day_of_week,
  //     time_slot_name,
  //     store_id,
  //     id: { [Op.ne]: id },
  //   },
  // });
  // Vérifier s'il n'y a pas de conflit avec d'autres jours de présence du même point, jour et créneau

  existing.collection_point_id = data.collection_point_id;
  existing.store_id = data.store_id;
  existing.scheduled_date = data.day_of_week;
  existing.is_recurring = data.is_present;
  existing.start_time = data.start_time;
  existing.end_time = data.end_time;
  existing.is_24h = data.is_24h;
  existing.notes = data.notes;
  await existing.save();

  res.json({
    success: true,
    message: "Jours de présence mis à jour avec succès",
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deletePointPrecense = async (req, res) => {
  const id = z.coerce.number().positive().parse(req.params.id);
  return deleteSchedule(req, res);

  const deleted = await TaskSchedule.destroy({ where: { id } });
  if (deleted == 0)
    return res.status(404).json({
      success: false,
      message: "Jours de présence non trouvés",
    });
  res.json({
    success: true,
    message: "Jours de présence supprimés avec succès",
  });
};

// Fonction pour synchroniser les jours de présence avec le planning
const syncCollectionPointPresenceToPlanning = async (
  collectionPointId,
  startDate,
  endDate,
) => {
  // Récupérer les jours de présence du point de collecte
  const presenceHours = await CollectionPointPresence.findAll({
    where: { collection_point_id: collectionPointId },
    order: [["day_of_week"], ["time_slot_name"]],
  });

  if (presenceHours.length === 0)
    throw new createHttpError[404](
      "Aucun jour de présence configuré pour ce point de collecte - synchronisation ignorée",
    );
  // Récupérer les informations du point de collecte
  const collectionPoint = await CollectionPoint.findByPk(collectionPointId);

  if (!collectionPoint) {
    throw new createHttpError[404]("Point de collecte non trouvé");
  }

  const pointName = collectionPoint.name;
  const createdTasks = [];

  // Générer les tâches pour chaque jour dans la plage de dates
  const currentDate = new Date(startDate);
  const endDateObj = new Date(endDate);

  // Mapping des jours de la semaine
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  while (currentDate <= endDateObj) {
    const dayOfWeek = currentDate.getDay(); // 0 = dimanche, 1 = lundi, etc.
    const dayName = dayNames[dayOfWeek]; // Nom du jour en anglais

    // Trouver les jours de présence pour ce jour de la semaine (par nom de jour)
    const dayPresence = presenceHours.filter(
      (presence) => presence.day_of_week === dayName,
    );

    for (const presence of dayPresence) {
      // Vérifier si la présence est valide (présent)
      const isValidPresence =
        presence.is_present === 1 || presence.is_present === true;

      // Définir des horaires par défaut si non spécifiés
      let startTime = presence.start_time;
      let endTime = presence.end_time;

      if (!startTime || !endTime) {
        // Horaires par défaut selon le créneau
        switch (presence.time_slot_name) {
          case "Matin":
            startTime = "08:00";
            endTime = "12:00";
            break;
          case "Après-midi":
            startTime = "13:00";
            endTime = "17:00";
            break;
          case "Soir":
            startTime = "18:00";
            endTime = "22:00";
            break;
          default:
            startTime = "09:00";
            endTime = "17:00";
        }
      }

      if (isValidPresence) {
        // Créer une tâche pour cette présence
        const taskName = `${pointName} - Présence (${presence.time_slot_name || "Standard"
          })`;
        const taskDescription = `Présence au point de collecte ${pointName} de ${startTime} à ${endTime}`;

        // Vérifier si une tâche similaire existe déjà pour cette date
        const existingTask = await TaskSchedule.findAll({
          where: {
            store_id: presence.store,
            scheduled_date: currentDate.toISOString().split("T")[0],
            start_time: startTime,
            end_time: endTime,
          },
        });

        if (existingTask.length === 0) {
          // D'abord, créer ou récupérer la tâche "Présence point de collecte" (comme pour les horaires de magasin)
          let collectionPointTask = await Task.findAll({
            where: {
              name: `Présence point de collecte - ${pointName}`,
              category: "collection_operations",
            },
          });
          let taskId;
          if (collectionPointTask.length === 0) {
            // Créer la tâche si elle n'existe pas

            const taskResult = await Task.create({
              name: `Présence point de collecte - ${pointName}`,
              description: `Tâche de présence au point de collecte ${pointName}`,
              category: "collection_operations",
              priority: "high",
              estimated_duration: 480, // 8 heures par défaut
              location: pointName,
              is_recurring: true,
              recurrence_pattern: "weekly",
              status: "active",
            });
            taskId = taskResult.id;
          } else {
            taskId = collectionPointTask[0].id;
          }

          const result = await TaskSchedule.create({
            task_id: taskId,
            store_id: presence.store_id,
            scheduled_date: currentDate.toISOString().split("T")[0],
            start_time: startTime,
            end_time: endTime,
            status: "scheduled",
            notes: taskDescription,
          });

          createdTasks.push({
            id: result.id,
            task_name: taskName,
            scheduled_date: currentDate.toISOString().split("T")[0],
            start_time: startTime,
            end_time: endTime,
            collection_point_name: pointName,
          });
        }
      }
    }

    // Passer au jour suivant
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    success: true,
    message: `${createdTasks.length} tâches de présence créées`,
    tasks: createdTasks,
  };
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const planningSync = async (req, res) => {
  const { collection_point_id, start_date, end_date } = req.body;

  if (!collection_point_id || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: "collection_point_id, start_date et end_date sont requis",
    });
  }

  const result = await syncCollectionPointPresenceToPlanning(
    collection_point_id,
    start_date,
    end_date,
  );

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
};
