-- Database: testing

-- DROP DATABASE IF EXISTS testing;

CREATE TABLE Dron (
	IdDron INT PRIMARY KEY,
	Modelo VARCHAR(255)
);

CREATE TABLE Sensor (
	IdSensor INT PRIMARY KEY,
	IdDron INT REFERENCES Dron(IdDron),
	Tipo VARCHAR(255)
);

CREATE TABLE Mision (
	IdMision INT PRIMARY KEY,
	Latitud DECIMAL,
	Longitud DECIMAL,
	FechaHora TIMESTAMP,
	HoraInicio TIME,
	HoraTermino TIME,
	PlanVuelo VARCHAR(255)
);

CREATE TABLE LecturaSensor (
	IdLecturaSensor INT PRIMARY KEY,
	IdSensor INT REFERENCES Sensor(IdSensor),
	IdMision INT REFERENCES Mision(IdMision),
	Tipo VARCHAR(255),
	Valor DECIMAL,
	Altura DECIMAL,
	HoraMinSeg TIME
);