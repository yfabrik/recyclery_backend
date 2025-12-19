import { Op } from "sequelize";
import db from "../../models/index.js";

const { StoreHours, Recyclery, TaskSchedule, Task } = db;
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listHoraires = async (req, res) => {
  const horaires = await StoreHours.findAll({
    include: [{ model: Recyclery }],
  });

  res.json({
    success: true,
    storeHours: horaires,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const horairesMagasin = async (req, res) => {
  const { storeId } = req.params;

  const storeHours = await Recyclery.findByPk(storeId, {
    include: [{ model: StoreHours, as: "horaires" }],
    order: [["day_of_week"]],
  });

  res.json({
    success: true,
    storeHours,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const addHoraire = async (req, res) => {
  const {
    store_id,
    day_of_week,
    time_slot_name,
    is_open,
    open_time,
    close_time,
    is_24h,
    notes,
  } = req.body;

  // Validation des champs requis
  if (!store_id || !day_of_week) {
    console.log("Erreur validation: store_id ou day_of_week manquant");
    return res.status(400).json({
      success: false,
      message: "ID du magasin et jour de la semaine sont obligatoires",
    });
  }
  const store = await Recyclery.findByPk(store_id);

  if (await store.hasHoraires({ where: day_of_week })) {
    return res.status(400).json({
      success: false,
      message:
        "Des horaires existent déjà pour ce magasin, ce jour et ce créneau",
    });
  }
  const horaire = await store.createHoraire({
    day_of_week,
    time_slot_name,
    is_open,
    open_time,
    close_time,
    is_24h,
    notes,
  });

  res.json({
    success: true,
    message: "Horaires créés avec succès",
    id: horaire.id,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const updateHoraire = async (req, res) => {
  const { id } = req.params;
  const {
    store_id,
    day_of_week,
    time_slot_name,
    is_open,
    open_time,
    close_time,
    is_24h,
    notes,
  } = req.body;

  const existing = await StoreHours.findByPk(id);
  // Vérifier que les horaires existent
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Horaires non trouvés",
    });
  }

  const store = await Recyclery.findByPk(store_id, {
    include: [{ model: StoreHours, as: "horaires" }],
  });


  // Vérifier s'il n'y a pas de conflit avec d'autres horaires du même magasin, jour et créneau
  const duplicate = await store.countHoraires({
    where: { day_of_week, time_slot_name, id: { [Op.ne]: id } },
  });
  if (duplicate) {
    return res.status(400).json({
      success: false,
      message:
        "Des horaires existent déjà pour ce magasin, ce jour et ce créneau",
    });
  }
  existing.day_of_week = day_of_week;
  existing.time_slot_name = time_slot_name;
  existing.open_time = open_time;
  existing.close_time = close_time;
  existing.is_24h = is_24h;
  existing.notes = notes;
  existing.is_open = is_open;

  await existing.save();

  res.json({
    success: true,
    message: "Horaires mis à jour avec succès",
    horaire:existing
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const removeHoraires = async (req, res) => {
  const { id } = req.params;

  await StoreHours.destroy({ where: { id } });

  res.json({
    success: true,
    message: "Horaires supprimés avec succès",
  });
};

const syncStoreHoursToPlanning = async (storeId, startDate, endDate) => {
  // Récupérer les horaires d'ouverture du magasin
  const storeHours = await StoreHours.findAll({
    where: { store_id: storeId },
    order: [["day_of_week"], ["time_slot_name"]],
  });

  if (storeHours.length === 0) {
    return {
      success: false,
      message: "Aucun horaire d'ouverture trouvé pour ce magasin",
    };
  }

  // Récupérer les informations du magasin
  const store = await Recyclery.findByPk(storeId);

  if (!store) {
    return { success: false, message: "Magasin non trouvé" };
  }

  const storeName = store.name;
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

    // Trouver les horaires pour ce jour de la semaine (par nom de jour)
    const dayHours = storeHours.filter((hour) => hour.day_of_week === dayName);

    for (const hour of dayHours) {
      // Vérifier si l'horaire est valide (ouvert et pas 24h/24)
      const isValidHour =
        (hour.is_open === 1 || hour.is_open === true) &&
        (hour.is_24h === 0 || hour.is_24h === false || hour.is_24h === null) &&
        hour.open_time &&
        hour.close_time;

      if (isValidHour) {
        // Créer une tâche pour cet horaire
        const taskName = `${storeName} - Ouverture (${
          hour.time_slot_name || "Standard"
        })`;
        const taskDescription = `Ouverture du magasin ${storeName} de ${hour.open_time} à ${hour.close_time}`;

        // Vérifier si une tâche similaire existe déjà pour cette date
        const existingTask = await TaskSchedule.findAll({
          where: {
            store_id: storeId,
            scheduled_date: currentDate.toISOString().split("T")[0],
            start_time: hour.open_time,
            end_time: hour.close_time,
          },
        });

        if (existingTask.length === 0) {
          // D'abord, créer ou récupérer la tâche "Ouverture de magasin"
          let storeOpeningTask = await Task.findAll({
            where: {
              name: `Ouverture de magasin - ${storeName}`,
              category: "store_operations",
            },
          });

          let taskId;
          if (storeOpeningTask.length === 0) {
            // Créer la tâche si elle n'existe pas
            const taskResult = await Task.create({
              name: `Ouverture de magasin - ${storeName}`,
              description: `Tâche d'ouverture du magasin ${storeName}`,
              category: "store_operations",
              priority: "high",
              estimated_duration: 480, // 8 heures par défaut
              location: storeName,
              is_recurring: true,
              recurrence_pattern: "weekly",
              status: "active",
            });

            taskId = taskResult.id;
          } else {
            taskId = storeOpeningTask[0].id;
          }

          // Créer la tâche dans le planning (sans assignation initiale)
          const result = await TaskSchedule.create({
            task_id: taskId,
            store_id: storeId,
            scheduled_date: currentDate.toISOString().split("T")[0],
            start_time: hour.open_time,
            end_time: hour.close_time,

            notes: taskDescription,
          });

          createdTasks.push({
            id: result.id,
            task_name: taskName,
            scheduled_date: currentDate.toISOString().split("T")[0],
            start_time: hour.open_time,
            end_time: hour.close_time,
            store_name: storeName,
          });
        }
      }
    }

    // Passer au jour suivant
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    success: true,
    message: `${createdTasks.length} tâches d'ouverture créées`,
    tasks: createdTasks,
  };
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const syncHoraires = async (req, res) => {
  const { store_id, start_date, end_date } = req.body;

  if (!store_id || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: "store_id, start_date et end_date sont requis",
    });
  }
  const result = await syncStoreHoursToPlanning(store_id, start_date, end_date);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
};
