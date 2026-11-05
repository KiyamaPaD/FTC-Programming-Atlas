import java.util.ArrayList;

// Exemplu Java pentru calculator. Nu comanda motoare si nu este un OpMode.
public class AtlasJavaBasicsDemo {
    private static final double MAX_POWER = 1.0;

    public static void main(String[] args) {
        int count = 3;
        double power = 0.75;
        boolean ready = true;
        String label = "READY";

        System.out.println("Impartire intreaga: " + (5 / 2));
        System.out.println("Impartire reala: " + (5 / 2.0));

        if (ready && "READY".equals(label)) {
            power = clampPower(power + 0.50);
        }
        System.out.println("Putere limitata: " + power);

        double[] powers = {0.20, 0.45, 0.80};
        for (int i = 0; i < powers.length; i++) {
            System.out.println("powers[" + i + "] = " + powers[i]);
        }

        ArrayList<String> actions = new ArrayList<>();
        actions.add("INTAKE");
        actions.add("SCORE");
        System.out.println("Prima actiune: " + actions.get(0));
        System.out.println("Actiuni: " + actions.size());

        RobotState state = RobotState.INTAKE;
        while (count > 0) {
            count--;
        }
        if (count == 0) {
            state = RobotState.SCORE;
        }
        switch (state) {
            case SCORE:
                System.out.println("Stare: SCORE");
                break;
            default:
                System.out.println("Stare: IDLE sau INTAKE");
                break;
        }

        LiftModel lift = new LiftModel(0.0);
        LiftModel alias = lift;
        alias.setTargetHeight(12.5);
        System.out.println("Tinta prin lift: " + lift.getTargetHeight());

        replaceLocalReference(alias);
        System.out.println("Tinta dupa reasignarea parametrului: " + lift.getTargetHeight());

        double original = 0.8;
        halveLocalValue(original);
        System.out.println("Primitiva originala: " + original);
    }

    private static double clampPower(double value) {
        return Math.max(-MAX_POWER, Math.min(MAX_POWER, value));
    }

    private static void replaceLocalReference(LiftModel model) {
        // Se schimba doar copia locala a referintei.
        model = new LiftModel(0.0);
    }

    private static void halveLocalValue(double value) {
        // Se schimba doar copia locala a numarului.
        value = value / 2.0;
    }
}

// Doar clasa publica trebuie sa aiba numele fisierului.
enum RobotState {
    IDLE,
    INTAKE,
    SCORE
}

// Model de date; nu deplaseaza fizic un lift.
class LiftModel {
    private double targetHeight;

    LiftModel(double initialHeight) {
        targetHeight = initialHeight;
    }

    void setTargetHeight(double height) {
        targetHeight = height;
    }

    double getTargetHeight() {
        return targetHeight;
    }
}
