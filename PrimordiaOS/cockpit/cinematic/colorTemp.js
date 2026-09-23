export class ColorTemperature {
    getKelvinSpectrum(kelvin) {
        return kelvin > 6500 ? "#A3E635" : "#60A5FA";
    }
}
