import { useMemo, useState } from "react";
import SuggestField from "./SuggestField";
import { DEGREES_PG, DEGREES_UG } from "./suggestData";
import { mergeOptions } from "./normalize";
import { useExtras } from "./suggestApi";

// Degree dropdown with an "Other" choice that opens a text box.
// Whatever HR types in "Other" is cleaned up and saved, so it shows in this dropdown for everyone next time.
export default function DegreeField({ Select, label, name, value, level, inputClassName, onSelect }) {
  const base = level === "pg" ? DEGREES_PG : DEGREES_UG;
  const extraType = level === "pg" ? "degree_pg" : "degree_ug";
  const extras = useExtras(extraType);
  const options = useMemo(() => mergeOptions(base, extras), [base, extras]);

  const [otherMode, setOtherMode] = useState(false);
  const inList = !value || options.includes(value);
  const showOther = otherMode || !inList;

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === "__other__") {
      setOtherMode(true);
      onSelect("");
    } else {
      setOtherMode(false);
      onSelect(v);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Select label={label} name={name} value={showOther ? "__other__" : value} onChange={handleSelect}>
        <option value="">Select Degree</option>
        {options.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
        <option value="__other__">Other</option>
      </Select>
      {showOther && (
        <SuggestField
          hideLabel
          label="Other degree"
          name={`${name}_other`}
          value={value}
          baseOptions={base}
          extraType={extraType}
          placeholder="Type your degree name"
          inputClassName={inputClassName}
          onChange={onSelect}
        />
      )}
    </div>
  );
}
