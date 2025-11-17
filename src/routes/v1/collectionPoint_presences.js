import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

import db from "../../models/index.js";
import { Op } from "sequelize";

const { CollectionPointPresence, CollectionPoint,Task } = db;
export const router = Router();

// Récupérer tous les jours de présence des points de collecte
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const presence_hours = await CollectionPointPresence.findAll({
      include: [{ model: CollectionPoint }],
    });

    res.json({
      success: true,
      presence_hours,
    });
  })
);

// Récupérer les jours de présence d'un point de collecte spécifique
router.get(
  "/collection-point/:collectionPointId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { collectionPointId } = req.params;
    const presence_hours = await CollectionPointPresence.findByPk(
      collectionPointId,
      { include: [{ model: CollectionPoint }], order: ["day_of_week"] }
    );

    res.json({
      success: true,
      presence_hours,
    });
  })
);

// Créer de nouveaux jours de présence
router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const {
      collection_point_id,
      store_id,
      day_of_week,
      time_slot_name,
      is_present,
      start_time,
      end_time,
      is_24h,
      notes,
    } = req.body;

    // Validation des champs requis
    if (!collection_point_id || !day_of_week) {
      return res.status(400).json({
        success: false,
        message:
          "ID du point de collecte et jour de la semaine sont obligatoires",
      });
    }

    const existing = await CollectionPointPresence.findOne({
      where: { collection_point_id, day_of_week, time_slot_name, store_id },
    });
    // Vérifier si des jours de présence existent déjà pour ce point, ce jour et ce créneau

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "Des jours de présence existent déjà pour ce point, ce jour et ce créneau",
      });
    }

    const precence = await CollectionPointPresence.create({
      collection_point_id,
      store_id,
      day_of_week,
      time_slot_name,
      is_present,
      start_time,
      end_time,
      is_24h,
      notes,
    });

    res.json({
      success: true,
      message: "Jours de présence créés avec succès",
      id: precence.id,
    });
  })
);

// Mettre à jour des jours de présence
router.put(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      collection_point_id,
      store_id,
      day_of_week,
      time_slot_name,
      is_present,
      start_time,
      end_time,
      is_24h,
      notes,
    } = req.body;

    const existing = await CollectionPointPresence.findByPk(id);
    // Vérifier que les jours de présence existent

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Jours de présence non trouvés",
      });
    }

    const conflict = await CollectionPointPresence.findOne({
      where: {
        collection_point_id,
        day_of_week,
        time_slot_name,
        store_id,
        id: { [Op.ne]: id },
      },
    });
    // Vérifier s'il n'y a pas de conflit avec d'autres jours de présence du même point, jour et créneau

    if (conflict) {
      return res.status(400).json({
        success: false,
        message:
          "Des jours de présence existent déjà pour ce point, ce jour et ce créneau",
      });
    }

    existing.collection_point_id ??= collection_point_id;
    existing.store_id ??= store_id;
    existing.day_of_week ??= day_of_week;
    existing.time_slot_name ??= time_slot_name;
    existing.is_present ??= is_present;
    existing.start_time ??= start_time;
    existing.end_time ??= end_time;
    existing.is_24h ??= is_24h;
    existing.notes ??= notes;
    await existing.save();

    res.json({
      success: true,
      message: "Jours de présence mis à jour avec succès",
    });
  })
);

// Supprimer des jours de présence
router.delete(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = await CollectionPointPresence.findByPk(id);
    // Vérifier que les jours de présence existent

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Jours de présence non trouvés",
      });
    }
    const deleted = await CollectionPointPresence.destroy({ where: { id } });

    res.json({
      success: true,
      message: "Jours de présence supprimés avec succès",
    });
  })
);

// Fonction pour synchroniser les jours de présence avec le planning
const syncCollectionPointPresenceToPlanning = async (
  collectionPointId,
  startDate,
  endDate
) => {
  try {
    await database.connect();

    // Récupérer les jours de présence du point de collecte
    const presenceHours = await database.query(
      `
      SELECT * FROM collection_point_presence 
      WHERE collection_point_id = ? 
      ORDER BY day_of_week, time_slot_name
    `,
      [collectionPointId]
    );

    console.log(
      "🔍 Jours de présence trouvés pour le point",
      collectionPointId,
      ":",
      presenceHours.length
    );
    presenceHours.forEach((h) => {
      console.log(
        "  📅 Jour",
        h.day_of_week,
        "-",
        h.time_slot_name,
        ":",
        h.start_time,
        "-",
        h.end_time,
        "(présent:",
        h.is_present,
        ", 24h:",
        h.is_24h,
        ")"
      );
    });

    if (presenceHours.length === 0) {
      return {
        success: true,
        message:
          "Aucun jour de présence configuré pour ce point de collecte - synchronisation ignorée",
        tasks: [],
        debug: {
          presenceHoursFound: 0,
          presenceHoursDetails: [],
          dateRange: { start: startDate, end: endDate },
          totalDays:
            Math.ceil(
              (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
            ) + 1,
          debugLogs: [
            "Aucun jour de présence configuré pour ce point de collecte",
          ],
        },
      };
    }

    // Récupérer les informations du point de collecte
    const collectionPoint = await database.query(
      "SELECT * FROM collection_points WHERE id = ?",
      [collectionPointId]
    );
    if (collectionPoint.length === 0) {
      return { success: false, message: "Point de collecte non trouvé" };
    }

    const pointName = collectionPoint[0].name;
    const createdTasks = [];
    const debugLogs = [];

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

      console.log(
        `🔍 Vérification du jour ${
          currentDate.toISOString().split("T")[0]
        } (${dayName})`
      );
      debugLogs.push(
        `🔍 Vérification du jour ${
          currentDate.toISOString().split("T")[0]
        } (${dayName})`
      );

      // Trouver les jours de présence pour ce jour de la semaine (par nom de jour)
      const dayPresence = presenceHours.filter(
        (presence) => presence.day_of_week === dayName
      );

      console.log(
        `📅 Jours de présence trouvés pour ${dayName}:`,
        dayPresence.length
      );
      debugLogs.push(
        `📅 Jours de présence trouvés pour ${dayName}: ${dayPresence.length}`
      );

      for (const presence of dayPresence) {
        console.log("🔍 Vérification présence:", {
          day: currentDate.toISOString().split("T")[0],
          presence: presence.time_slot_name,
          is_present: presence.is_present,
          is_24h: presence.is_24h,
          start_time: presence.start_time,
          end_time: presence.end_time,
        });

        // Vérifier si la présence est valide (présent)
        const isValidPresence =
          presence.is_present === 1 || presence.is_present === true;

        console.log("🔍 Validation détaillée:", {
          is_present: presence.is_present,
          is_present_type: typeof presence.is_present,
          is_present_equals_1: presence.is_present === 1,
          is_present_equals_true: presence.is_present === true,
          isValidPresence,
        });

        debugLogs.push(
          `🔍 Validation détaillée: is_present=${
            presence.is_present
          }, type=${typeof presence.is_present}, equals_1=${
            presence.is_present === 1
          }, equals_true=${
            presence.is_present === true
          }, isValid=${isValidPresence}`
        );

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

        console.log("🔍 Validation présence:", {
          is_present: presence.is_present,
          is_24h: presence.is_24h,
          original_start_time: presence.start_time,
          original_end_time: presence.end_time,
          calculated_start_time: startTime,
          calculated_end_time: endTime,
          isValid: isValidPresence,
        });

        if (isValidPresence) {
          console.log("✅ Création d'une tâche pour cette présence");
          debugLogs.push("✅ Création d'une tâche pour cette présence");
          console.log("🔍 Détails de la tâche à créer:", {
            pointName,
            timeSlot: presence.time_slot_name,
            startTime,
            endTime,
            scheduledDate: currentDate.toISOString().split("T")[0],
          });
          debugLogs.push(
            `🔍 Détails de la tâche à créer: ${pointName} - ${
              presence.time_slot_name
            } - ${startTime}-${endTime} - ${
              currentDate.toISOString().split("T")[0]
            }`
          );

          // Créer une tâche pour cette présence
          const taskName = `${pointName} - Présence (${
            presence.time_slot_name || "Standard"
          })`;
          const taskDescription = `Présence au point de collecte ${pointName} de ${startTime} à ${endTime}`;

          // Vérifier si une tâche similaire existe déjà pour cette date
          const existingTask = await database.query(
            `
            SELECT id FROM task_schedules 
            WHERE store_id = ? 
            AND scheduled_date = ? 
            AND start_time = ? 
            AND end_time = ?
          `,
            [
              presence.store_id || null,
              currentDate.toISOString().split("T")[0],
              startTime,
              endTime,
            ]
          );

          console.log("🔍 Vérification tâche existante:", {
            storeId: presence.store_id || null,
            scheduledDate: currentDate.toISOString().split("T")[0],
            startTime,
            endTime,
            pointName,
            existingTasks: existingTask.length,
          });

          debugLogs.push(
            `🔍 Vérification tâche existante: storeId=${
              presence.store_id || null
            }, date=${
              currentDate.toISOString().split("T")[0]
            }, start=${startTime}, end=${endTime}, point=${pointName}, existing=${
              existingTask.length
            }`
          );

          if (existingTask.length === 0) {
            console.log(
              "✅ Aucune tâche existante trouvée, création d'une nouvelle tâche"
            );
            debugLogs.push(
              "✅ Aucune tâche existante trouvée, création d'une nouvelle tâche"
            );

            // D'abord, créer ou récupérer la tâche "Présence point de collecte" (comme pour les horaires de magasin)
            let collectionPointTask = await database.query(
              `
              SELECT id FROM tasks 
              WHERE name = ? AND category = 'collection_operations'
            `,
              [`Présence point de collecte - ${pointName}`]
            );

            let taskId;
            if (collectionPointTask.length === 0) {
              // Créer la tâche si elle n'existe pas
              const taskResult = await database.run(
                `
                INSERT INTO tasks (
                  name, description, category, priority, estimated_duration, 
                  location, is_recurring, recurrence_pattern, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              `,
                [
                  `Présence point de collecte - ${pointName}`,
                  `Tâche de présence au point de collecte ${pointName}`,
                  "collection_operations",
                  "high",
                  480, // 8 heures par défaut
                  pointName,
                  1, // récurrente
                  "weekly",
                  "active",
                ]
              );
              taskId = taskResult.lastID;
            } else {
              taskId = collectionPointTask[0].id;
            }

            // Créer la tâche dans le planning (sans assignation initiale)
            console.log("🔧 Création de la tâche dans le planning:", {
              taskId,
              assignedTo: null,
              storeId: presence.store_id || null,
              scheduledDate: currentDate.toISOString().split("T")[0],
              startTime,
              endTime,
              taskDescription,
            });

            const result = await database.run(
              `
              INSERT INTO task_schedules (
                task_id, assigned_to, store_id, scheduled_date, start_time, end_time, status, notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `,
              [
                taskId,
                null, // Pas d'assignation initiale - sera assigné plus tard
                presence.store_id || null, // Store ID du point de collecte
                currentDate.toISOString().split("T")[0],
                startTime,
                endTime,
                "scheduled", // Statut explicite
                taskDescription,
              ]
            );

            console.log("✅ Tâche créée avec succès, ID:", result.lastID);

            createdTasks.push({
              id: result.lastID,
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
      debug: {
        presenceHoursFound: presenceHours.length,
        presenceHoursDetails: presenceHours.map((h) => ({
          day: h.day_of_week,
          slot: h.time_slot_name,
          start: h.start_time,
          end: h.end_time,
          is_present: h.is_present,
          is_24h: h.is_24h,
        })),
        dateRange: { start: startDate, end: endDate },
        totalDays:
          Math.ceil(
            (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
          ) + 1,
        debugLogs: debugLogs,
      },
    };
  } catch (error) {
    console.error(
      "Erreur lors de la synchronisation des jours de présence:",
      error
    );
    return {
      success: false,
      message: "Erreur lors de la synchronisation",
      error: error.message,
    };
  }
};

// Route de débogage pour vérifier les tâches existantes
router.get("/debug-tasks/:date",
     authenticateToken, 
    asyncHandler(async (req, res) => {


    const { date } = req.params;
    const tasks = await TaskSchedule.findAll({include:[{model:Task}],where:{scheduled_task:date},order:["start_time"]})
    // Vérifier toutes les tâches pour cette date
    

    res.json({
      success: true,
      date,
    });
  
}))

// Route pour synchroniser les jours de présence avec le planning
router.post("/sync-to-planning", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 SYNC COLLECTION POINT PRESENCE API CALLED");
    console.log("📊 Request body:", req.body);

    const { collection_point_id, start_date, end_date } = req.body;

    console.log("📊 Parsed params:", {
      collection_point_id,
      start_date,
      end_date,
    });

    if (!collection_point_id || !start_date || !end_date) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        success: false,
        message: "collection_point_id, start_date et end_date sont requis",
      });
    }

    console.log("✅ All required fields present, calling sync function...");

    const result = await syncCollectionPointPresenceToPlanning(
      collection_point_id,
      start_date,
      end_date
    );

    console.log("📊 Sync result:", result);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error(
      "❌ Erreur synchronisation jours de présence vers planning:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Erreur lors de la synchronisation",
      error: error.message,
    });
  }
});

