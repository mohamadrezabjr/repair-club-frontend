"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { Car, PartItem, ServiceItem, ServiceStatus } from "@/lib/types"
import { initialCars } from "@/lib/data"

interface GarageContextValue {
  cars: Car[]
  addCar: (car: Omit<Car, "id" | "entryAt" | "services" | "parts">) => string
  removeCar: (carId: string) => void
  updateCar: (carId: string, patch: Partial<Car>) => void
  addService: (carId: string, service: Omit<ServiceItem, "id">) => void
  updateServiceStatus: (carId: string, serviceId: string, status: ServiceStatus) => void
  removeService: (carId: string, serviceId: string) => void
  addPart: (carId: string, part: Omit<PartItem, "id">) => void
  removePart: (carId: string, partId: string) => void
}

const GarageContext = createContext<GarageContextValue | null>(null)

const uid = () => Math.random().toString(36).slice(2, 10)

export function GarageProvider({ children }: { children: React.ReactNode }) {
  const [cars, setCars] = useState<Car[]>(initialCars)

  const addCar = useCallback<GarageContextValue["addCar"]>((car) => {
    const id = uid()
    setCars((prev) => [
      { ...car, id, entryAt: Date.now(), services: [], parts: [] },
      ...prev,
    ])
    return id
  }, [])

  const removeCar = useCallback((carId: string) => {
    setCars((prev) => prev.filter((c) => c.id !== carId))
  }, [])

  const updateCar = useCallback((carId: string, patch: Partial<Car>) => {
    setCars((prev) => prev.map((c) => (c.id === carId ? { ...c, ...patch } : c)))
  }, [])

  const addService = useCallback((carId: string, service: Omit<ServiceItem, "id">) => {
    setCars((prev) =>
      prev.map((c) =>
        c.id === carId ? { ...c, services: [...c.services, { ...service, id: uid() }] } : c,
      ),
    )
  }, [])

  const updateServiceStatus = useCallback(
    (carId: string, serviceId: string, status: ServiceStatus) => {
      setCars((prev) =>
        prev.map((c) =>
          c.id === carId
            ? {
                ...c,
                services: c.services.map((s) => (s.id === serviceId ? { ...s, status } : s)),
              }
            : c,
        ),
      )
    },
    [],
  )

  const removeService = useCallback((carId: string, serviceId: string) => {
    setCars((prev) =>
      prev.map((c) =>
        c.id === carId ? { ...c, services: c.services.filter((s) => s.id !== serviceId) } : c,
      ),
    )
  }, [])

  const addPart = useCallback((carId: string, part: Omit<PartItem, "id">) => {
    setCars((prev) =>
      prev.map((c) =>
        c.id === carId ? { ...c, parts: [...c.parts, { ...part, id: uid() }] } : c,
      ),
    )
  }, [])

  const removePart = useCallback((carId: string, partId: string) => {
    setCars((prev) =>
      prev.map((c) =>
        c.id === carId ? { ...c, parts: c.parts.filter((p) => p.id !== partId) } : c,
      ),
    )
  }, [])

  const value = useMemo<GarageContextValue>(
    () => ({
      cars,
      addCar,
      removeCar,
      updateCar,
      addService,
      updateServiceStatus,
      removeService,
      addPart,
      removePart,
    }),
    [cars, addCar, removeCar, updateCar, addService, updateServiceStatus, removeService, addPart, removePart],
  )

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>
}

export function useGarage() {
  const ctx = useContext(GarageContext)
  if (!ctx) throw new Error("useGarage must be used within GarageProvider")
  return ctx
}
