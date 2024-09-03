
exports.seed = function(knex) {
  return knex.raw(`
  CREATE 
  OR 
  REPLACE 
  FUNCTION 
	  reverb.func_get_var(
		  _keys TEXT[], 
		  _context reverb.SETTING_CONTEXT, 
		  _object_id TEXT DEFAULT NULL,
		  _client_id TEXT DEFAULT NULL)
		  
	 RETURNS TABLE(
		  "key" TEXT,
		  "value" TEXT []
	 )
	  
  language plpgsql
		
  AS $func$
  
  BEGIN
	  
	  CREATE TEMP TABLE ret ("key" TEXT, "value" TEXT) ON COMMIT DROP;	
	  
	  -- CUSTOM VALUES CAN ONLY BE RETRIEVED IF A CLIENT ID WAS PROVIDED
	  IF _client_id IS NOT NULL THEN
		  
		  INSERT INTO ret(
		  
			  SELECT 
					sd.setting_key AS "key",
				  gs.value AS "value"
			  FROM 
					 reverb.global_vars gs
			  LEFT JOIN 
				  reverb.var_definition sd ON gs.var_definition_id = sd._id
			  WHERE 
					_keys is null
					OR
				  sd.setting_key = ANY(_keys)
				   AND 
				   gs.object_id = _object_id
				   AND 
				   sd.context = _context
				   AND 
				   sd.client_id = _client_id
		  );
  
		  IF ((select count(*) from ret) < array_length(_keys, 1)) THEN
			  
			  INSERT INTO ret (
			  
				  SELECT
						sd.setting_key AS "key",
					  sd.fallback_value AS "value"
					 FROM 
						 reverb.var_definition sd
					 WHERE	                   	
						 sd.setting_key = ANY(_keys)
				   AND 
						  sd.context = _context
				   AND 
					  sd.client_id = _client_id
				  AND
					  sd.setting_key NOT IN (select r."key" from ret r)
			  );
			  
		  END IF;
  
	  -- GLOBAL VALUES DO NOT HAVE A CLIENT ASSOCIATED TO IT
	  ELSE
		  
		  INSERT INTO ret (
		  
			  SELECT
				   sd.setting_key AS "key",
				  gs.value AS "value"
			  FROM 
					 reverb.global_vars gs
			  LEFT JOIN 
				  reverb.var_definition sd 
				  ON 
				  gs.var_definition_id = sd._id
			   WHERE
					_keys is null
				  OR
					 sd.setting_key = ANY(_keys)
				  AND 
				   gs.object_id = _object_id
				  AND 
				  sd.context = _context
		  );
  
		  IF ((select count(*) from ret) < array_length(_keys, 1)) THEN
			  
			  INSERT INTO ret (
			  
				  SELECT
						sd.setting_key AS "key",
					  sd.fallback_value AS "value"
					 FROM 
						 reverb.var_definition sd
				  WHERE
						(
							_keys is null
							OR
							 sd.setting_key = ANY(_keys)
						 )
						 AND
					  sd.setting_key NOT IN (select r."key" from ret r)
					   AND 
					   sd.context = _context
					   AND 
					   sd.client_id IS NULL
			   );
		   
		  END IF;
	 
	  END IF;
	 
	  RETURN QUERY select r."key", r."value"::text[] from ret r;
  END
  $func$;
      `);
};